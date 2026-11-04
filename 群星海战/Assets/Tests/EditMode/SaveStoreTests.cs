using System;
using System.IO;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using StellarSea.Data;

namespace StellarSea.Tests.EditMode
{
    public sealed class SaveStoreTests
    {
        private string _dir;
        private ManualClock _clock;

        [SetUp]
        public void SetUp()
        {
            _dir = Path.Combine(Path.GetTempPath(), "StellarSeaTests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(_dir);
            _clock = new ManualClock(1700000000000);
        }

        [TearDown]
        public void TearDown()
        {
            try
            {
                if (Directory.Exists(_dir)) Directory.Delete(_dir, true);
            }
            catch
            {
                // 测试清理失败不影响结果
            }
        }

        private SaveStore NewStore(int version = 1, SaveMigrator migrator = null)
            => new SaveStore(_dir, _clock, version, migrator);

        [Test]
        public void SaveAndLoad_RoundTripsAllSections()
        {
            var store = NewStore();
            var data = store.CreateNewSave();
            data.player.gold = 12345;
            data.player.diamond = 678;
            data.ships.Add(new ShipInstance { instanceId = "s1", configId = "ship_anchor_01", level = 7, star = 3 });
            data.captains.Add(new CaptainInstance { instanceId = "c1", configId = "captain_anchor_01", level = 4 });
            data.equipment.Add(new EquipmentInstance { instanceId = "e1", configId = "equip_main_gun_b", enhanceLevel = 5 });
            data.formation.front.Add("s1");
            data.formation.flagship = "s1";
            data.progress.stageStars["stage_1_1"] = 3;
            data.trade.tradeShips.Add(new TradeShipInstance { instanceId = "t1", configId = "ship_trade_small" });
            data.gacha.pools["gacha_ship_standard"].ssCount = 12;
            data.tasks.dailyProgress["task_daily_login"] = 1;

            store.Save(data);
            var result = store.Load();

            Assert.AreEqual(LoadStatus.Loaded, result.Status);
            Assert.AreEqual(12345, result.Data.player.gold);
            Assert.AreEqual(678, result.Data.player.diamond);
            Assert.AreEqual(1, result.Data.ships.Count);
            Assert.AreEqual(7, result.Data.ships[0].level);
            Assert.AreEqual(3, result.Data.ships[0].star);
            Assert.AreEqual("s1", result.Data.formation.front[0]);
            Assert.AreEqual(3, result.Data.progress.stageStars["stage_1_1"]);
            Assert.AreEqual("ship_trade_small", result.Data.trade.tradeShips[0].configId);
            Assert.AreEqual(12, result.Data.gacha.pools["gacha_ship_standard"].ssCount);
            Assert.AreEqual(1, result.Data.tasks.dailyProgress["task_daily_login"]);
        }

        [Test]
        public void CorruptPrimary_FallsBackToBackup1()
        {
            var store = NewStore();
            var first = store.CreateNewSave();
            first.player.gold = 111;
            store.Save(first);

            _clock.Advance(TimeSpan.FromMinutes(1));
            var second = store.CreateNewSave();
            second.player.gold = 222;
            store.Save(second);

            File.WriteAllText(store.PrimaryPath, "{ this is not json");

            var result = store.Load();
            Assert.AreEqual(LoadStatus.RecoveredFromBackup1, result.Status);
            Assert.AreEqual(111, result.Data.player.gold);
        }

        [Test]
        public void CorruptPrimaryAndBackup1_FallsBackToBackup2()
        {
            var store = NewStore();
            var a = store.CreateNewSave();
            a.player.gold = 100;
            store.Save(a);

            _clock.Advance(TimeSpan.FromMinutes(1));
            var b = store.CreateNewSave();
            b.player.gold = 200;
            store.Save(b);

            _clock.Advance(TimeSpan.FromMinutes(1));
            var c = store.CreateNewSave();
            c.player.gold = 300;
            store.Save(c);

            File.WriteAllText(store.PrimaryPath, "broken");
            File.WriteAllText(store.Backup1Path, "broken");

            var result = store.Load();
            Assert.AreEqual(LoadStatus.RecoveredFromBackup2, result.Status);
            Assert.AreEqual(100, result.Data.player.gold);
        }

        [Test]
        public void AllFilesCorrupt_ReturnsNewSaveWithError()
        {
            var store = NewStore();
            var data = store.CreateNewSave();
            store.Save(data);
            File.WriteAllText(store.PrimaryPath, "broken");

            var result = store.Load();
            Assert.AreEqual(LoadStatus.NewSave, result.Status);
            Assert.IsNotNull(result.Error);
            Assert.AreEqual(2000, result.Data.player.gold);
        }

        [Test]
        public void Migration_V1ToV2_AppliesAndBumpsVersion()
        {
            var store = NewStore(2, new SaveMigrator(new ISaveMigration[] { new V1ToV2Migration() }));
            var v1 = new JObject
            {
                ["meta"] = new JObject
                {
                    ["schemaVersion"] = 1,
                    ["saveId"] = "legacy",
                    ["createdAt"] = 1,
                    ["lastSavedAt"] = 2,
                    ["lastSettleAt"] = 3,
                },
                ["player"] = new JObject { ["gold"] = 777 },
                ["settings"] = new JObject(),
            };
            File.WriteAllText(store.PrimaryPath, v1.ToString());

            var result = store.Load();

            Assert.AreEqual(LoadStatus.Loaded, result.Status);
            Assert.AreEqual(2, result.Data.meta.schemaVersion);
            Assert.AreEqual(777, result.Data.player.gold);
            Assert.AreEqual(0.33f, result.Data.settings.bgmVolume, 0.0001f);
        }

        [Test]
        public void MissingMigration_ReturnsNewSaveInsteadOfThrowing()
        {
            var store = NewStore(2);
            var v1 = new JObject
            {
                ["meta"] = new JObject { ["schemaVersion"] = 1 },
                ["player"] = new JObject { ["gold"] = 1 },
            };
            File.WriteAllText(store.PrimaryPath, v1.ToString());

            var result = store.Load();
            Assert.AreEqual(LoadStatus.NewSave, result.Status);
            Assert.IsNotNull(result.Error);
        }

        [Test]
        public void UnknownFields_ArePreservedAcrossLoadAndSave()
        {
            var store = NewStore();
            var data = store.CreateNewSave();
            data.player.gold = 5;
            store.Save(data);

            var root = JObject.Parse(File.ReadAllText(store.PrimaryPath));
            root["futureRootField"] = 42;
            ((JObject)root["player"])["futurePlayerField"] = "kept";
            File.WriteAllText(store.PrimaryPath, root.ToString());

            var loaded = store.Load();
            Assert.AreEqual(LoadStatus.Loaded, loaded.Status);
            store.Save(loaded.Data);

            var savedText = File.ReadAllText(store.PrimaryPath);
            StringAssert.Contains("futureRootField", savedText);
            StringAssert.Contains("futurePlayerField", savedText);
            StringAssert.Contains("kept", savedText);
        }

        [Test]
        public void ExportThenImport_RestoresData()
        {
            var store = NewStore();
            var data = store.CreateNewSave();
            data.player.gold = 9999;
            store.Save(data);

            string exportPath = Path.Combine(_dir, "export", "save-export.json");
            store.Export(data, exportPath);
            Assert.IsTrue(File.Exists(exportPath));

            var otherDir = Path.Combine(_dir, "other");
            var other = new SaveStore(otherDir, _clock);
            var imported = other.Import(exportPath);

            Assert.AreEqual(9999, imported.Data.player.gold);
            Assert.IsTrue(File.Exists(other.PrimaryPath));
            Assert.AreEqual(9999, other.Load().Data.player.gold);
        }

        [Test]
        public void Save_LeavesNoTempFile()
        {
            var store = NewStore();
            store.Save(store.CreateNewSave());
            Assert.IsFalse(File.Exists(store.TempPath));
        }

        [Test]
        public void Save_UpdatesTimestamps()
        {
            var store = NewStore();
            var data = store.CreateNewSave();
            data.meta.createdAt = 1;
            _clock.UtcNowMs = 5000;

            store.Save(data);

            Assert.AreEqual(5000, data.meta.lastSavedAt);
            Assert.AreEqual(1, data.meta.createdAt);
            Assert.AreEqual(store.CurrentVersion, data.meta.schemaVersion);
        }

        private sealed class V1ToV2Migration : ISaveMigration
        {
            public int FromVersion => 1;

            public JObject Apply(JObject save)
            {
                if (save["settings"] is not JObject settings)
                {
                    settings = new JObject();
                    save["settings"] = settings;
                }
                settings["bgmVolume"] = 0.33f;
                return save;
            }
        }
    }
}
