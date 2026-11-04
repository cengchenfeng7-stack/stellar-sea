using System.Collections.Generic;
using NUnit.Framework;
using StellarSea.Battle;
using StellarSea.Data;
using StellarSea.Data.Config;
using UnityEditor;

namespace StellarSea.Tests.EditMode
{
    /// <summary>M1 验收：初始 7 艘（3B + 3A + 新手券 SS）无养成通关第 1 章 1-10。</summary>
    public sealed class StageClearTests
    {
        private static ConfigDatabase LoadDb()
        {
            var db = AssetDatabase.LoadAssetAtPath<ConfigDatabase>("Assets/Config/ConfigDatabase.asset");
            Assert.IsNotNull(db, "先跑 Tools/StellarSea/Import Config CSV 生成配置资产");
            return db;
        }

        private static SaveData InitialSave()
        {
            var save = new SaveData();
            void Add(string id, string configId)
            {
                save.ships.Add(new ShipInstance { instanceId = id, configId = configId });
            }

            Add("s_anchor_b", "ship_anchor_01");
            Add("s_blue_b", "ship_blue_01");
            Add("s_red_b", "ship_red_01");
            Add("s_anchor_a", "ship_anchor_02");
            Add("s_blue_a", "ship_blue_02");
            Add("s_green_a", "ship_green_01");
            Add("s_anchor_ss", "ship_anchor_04");

            save.formation.front = new List<string> { "s_anchor_ss", "s_anchor_a", "s_anchor_b" };
            save.formation.back = new List<string> { "s_blue_a", "s_blue_b", "s_green_a" };
            save.formation.flagship = "s_red_b";
            return save;
        }

        [Test]
        public void ChapterOne_TenCombatStages_ClearedByInitialRoster()
        {
            var db = LoadDb();
            var save = InitialSave();

            for (int node = 1; node <= 10; node++)
            {
                string stageId = $"stage_1_{node}";
                var setup = BattleFactory.CreateFromSave(db, save, stageId, seed: "m1");
                var result = new BattleSimulator(setup).Run();

                TestContext.WriteLine(
                    $"{stageId}: victory={result.victory} timeout={result.timeout} rounds={result.rounds} " +
                    $"allyDeaths={result.allyDeaths} enemyDeaths={result.enemyDeaths} events={result.events.Count}");

                Assert.IsTrue(result.victory, $"{stageId} 未通关（rounds={result.rounds}, allyDeaths={result.allyDeaths}）");
            }
        }

        [Test]
        public void InitialRoster_HasSevenShipsAndSixOnField()
        {
            var save = InitialSave();
            Assert.AreEqual(7, save.ships.Count);
            Assert.AreEqual(3, save.formation.front.Count);
            Assert.AreEqual(3, save.formation.back.Count);
        }
    }
}
