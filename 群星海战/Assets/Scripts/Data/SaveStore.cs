using System;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace StellarSea.Data
{
    public enum LoadStatus
    {
        Loaded = 0,
        RecoveredFromBackup1 = 1,
        RecoveredFromBackup2 = 2,
        NewSave = 3,
    }

    public sealed class LoadResult
    {
        public LoadResult(SaveData data, LoadStatus status, string sourcePath, Exception error)
        {
            Data = data;
            Status = status;
            SourcePath = sourcePath;
            Error = error;
        }

        public SaveData Data { get; }
        public LoadStatus Status { get; }
        public string SourcePath { get; }
        public Exception Error { get; }

        public bool Recovered => Status == LoadStatus.RecoveredFromBackup1 || Status == LoadStatus.RecoveredFromBackup2;
        public bool IsNew => Status == LoadStatus.NewSave;
    }

    /// <summary>
    /// 本地 JSON 存档：原子写、双备份、损坏回退、版本迁移、导入导出。
    /// 不依赖 UnityEngine，可在 EditMode 测试中直接运行。
    /// </summary>
    public sealed class SaveStore
    {
        public const string PrimaryFileName = "save.json";
        public const string Backup1FileName = "save.bak1";
        public const string Backup2FileName = "save.bak2";
        public const string TempFileName = "save.tmp";

        private readonly string _directory;
        private readonly IClock _clock;
        private readonly SaveMigrator _migrator;
        private readonly JsonSerializerSettings _settings;

        public SaveStore(string directory, IClock clock, int currentVersion = 1, SaveMigrator migrator = null)
        {
            if (string.IsNullOrWhiteSpace(directory)) throw new ArgumentException("directory 不能为空", nameof(directory));
            _directory = directory;
            _clock = clock ?? throw new ArgumentNullException(nameof(clock));
            CurrentVersion = currentVersion;
            _migrator = migrator ?? new SaveMigrator();
            _settings = new JsonSerializerSettings
            {
                Formatting = Formatting.Indented,
                NullValueHandling = NullValueHandling.Include,
                MissingMemberHandling = MissingMemberHandling.Ignore,
                DateParseHandling = DateParseHandling.None,
            };
        }

        public int CurrentVersion { get; }
        public string DirectoryPath => _directory;
        public string PrimaryPath => Path.Combine(_directory, PrimaryFileName);
        public string Backup1Path => Path.Combine(_directory, Backup1FileName);
        public string Backup2Path => Path.Combine(_directory, Backup2FileName);
        public string TempPath => Path.Combine(_directory, TempFileName);

        /// <summary>新档。数值为 V3.3 第 24 章初始值；接入 ConfigDatabase 后改为读表。</summary>
        public SaveData CreateNewSave()
        {
            long now = _clock.UtcNowMs;
            var data = new SaveData();
            data.meta.schemaVersion = CurrentVersion;
            data.meta.saveId = Guid.NewGuid().ToString("N");
            data.meta.createdAt = now;
            data.meta.lastSavedAt = now;
            data.meta.lastSettleAt = now;
            data.player.gold = 2000;
            data.player.diamond = 1500;
            data.player.expBook = 10;
            data.player.shipCapacity = 20;
            data.trade.unlockedPorts.Add("port_dawn");
            data.trade.unlockedPorts.Add("port_anchor");
            data.trade.tradeLevel = 1;
            data.trade.routeSlots = 1;
            data.gacha.pools["gacha_ship_standard"] = new GachaPoolState();
            data.gacha.pools["gacha_ship_limited"] = new GachaPoolState();
            data.gacha.pools["gacha_captain"] = new GachaPoolState();
            data.gacha.pools["gacha_equip"] = new GachaPoolState();
            return data;
        }

        /// <summary>保存。失败时抛出异常；调用方负责提示玩家。</summary>
        public void Save(SaveData data)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));
            System.IO.Directory.CreateDirectory(_directory);

            long now = _clock.UtcNowMs;
            data.meta.schemaVersion = CurrentVersion;
            data.meta.lastSavedAt = now;
            if (string.IsNullOrEmpty(data.meta.saveId)) data.meta.saveId = Guid.NewGuid().ToString("N");
            if (data.meta.createdAt == 0) data.meta.createdAt = now;
            if (data.meta.lastSettleAt == 0) data.meta.lastSettleAt = now;

            string json = JsonConvert.SerializeObject(data, _settings);

            // 先校验能读回，再落盘，避免写出半截/坏档。
            var verify = JsonConvert.DeserializeObject<SaveData>(json, _settings);
            if (verify == null) throw new InvalidDataException("存档序列化校验失败");

            File.WriteAllText(TempPath, json, new UTF8Encoding(false));
            RotateBackups();
            ReplaceFile(TempPath, PrimaryPath);
        }

        /// <summary>读取。依次尝试主档、bak1、bak2；全部失败返回新档。</summary>
        public LoadResult Load()
        {
            var candidates = new[]
            {
                (PrimaryPath, LoadStatus.Loaded),
                (Backup1Path, LoadStatus.RecoveredFromBackup1),
                (Backup2Path, LoadStatus.RecoveredFromBackup2),
            };

            Exception lastError = null;
            foreach (var (path, status) in candidates)
            {
                if (!File.Exists(path)) continue;
                try
                {
                    var data = ReadFile(path);
                    return new LoadResult(data, status, path, null);
                }
                catch (Exception ex)
                {
                    lastError = ex;
                }
            }

            return new LoadResult(CreateNewSave(), LoadStatus.NewSave, null, lastError);
        }

        /// <summary>导出到指定路径；不改动当前存档文件。</summary>
        public void Export(SaveData data, string exportPath)
        {
            if (data == null) throw new ArgumentNullException(nameof(data));
            if (string.IsNullOrWhiteSpace(exportPath)) throw new ArgumentException("exportPath 不能为空", nameof(exportPath));

            data.meta.lastSavedAt = _clock.UtcNowMs;
            string json = JsonConvert.SerializeObject(data, _settings);
            var dir = Path.GetDirectoryName(exportPath);
            if (!string.IsNullOrEmpty(dir)) System.IO.Directory.CreateDirectory(dir);
            File.WriteAllText(exportPath, json, new UTF8Encoding(false));
        }

        /// <summary>导入：校验并迁移后写入当前存档（旧档自动进备份）。失败抛异常，不改动当前存档。</summary>
        public LoadResult Import(string importPath)
        {
            if (string.IsNullOrWhiteSpace(importPath)) throw new ArgumentException("importPath 不能为空", nameof(importPath));
            if (!File.Exists(importPath)) throw new FileNotFoundException("导入文件不存在", importPath);

            var data = ReadFile(importPath);
            Save(data);
            return new LoadResult(data, LoadStatus.Loaded, importPath, null);
        }

        private SaveData ReadFile(string path)
        {
            string json = File.ReadAllText(path, Encoding.UTF8);
            var root = JObject.Parse(json);
            root = _migrator.Migrate(root, CurrentVersion);
            var data = root.ToObject<SaveData>(JsonSerializer.Create(_settings));
            if (data == null) throw new InvalidDataException("存档为空");
            if (data.meta == null) data.meta = new MetaData();
            data.meta.schemaVersion = CurrentVersion;
            if (string.IsNullOrEmpty(data.meta.saveId)) data.meta.saveId = Guid.NewGuid().ToString("N");
            return data;
        }

        private void RotateBackups()
        {
            if (File.Exists(Backup1Path)) ReplaceFile(Backup1Path, Backup2Path);
            if (File.Exists(PrimaryPath)) ReplaceFile(PrimaryPath, Backup1Path);
        }

        private static void ReplaceFile(string source, string destination)
        {
            if (File.Exists(destination)) File.Delete(destination);
            File.Move(source, destination);
        }
    }
}
