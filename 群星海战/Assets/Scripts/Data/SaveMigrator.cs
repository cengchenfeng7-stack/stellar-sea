using System;
using System.Collections.Generic;
using Newtonsoft.Json.Linq;

namespace StellarSea.Data
{
    /// <summary>一次版本迁移：把 fromVersion 的 JObject 原地升级到 fromVersion + 1。</summary>
    public interface ISaveMigration
    {
        int FromVersion { get; }
        JObject Apply(JObject save);
    }

    /// <summary>
    /// 存档迁移器。每个版本一个迁移函数；缺少中间版本时直接报错，
    /// 避免“看起来能读、实际字段没补”的静默错误。
    /// </summary>
    public sealed class SaveMigrator
    {
        private readonly Dictionary<int, ISaveMigration> _migrations = new Dictionary<int, ISaveMigration>();

        public SaveMigrator(IEnumerable<ISaveMigration> migrations = null)
        {
            if (migrations == null) return;
            foreach (var m in migrations)
            {
                if (m == null) continue;
                if (_migrations.ContainsKey(m.FromVersion))
                    throw new ArgumentException($"重复的迁移版本 v{m.FromVersion}");
                _migrations.Add(m.FromVersion, m);
            }
        }

        public JObject Migrate(JObject save, int targetVersion)
        {
            if (save == null) throw new ArgumentNullException(nameof(save));
            if (targetVersion < 1) throw new ArgumentOutOfRangeException(nameof(targetVersion));

            int version = ReadVersion(save);
            if (version > targetVersion)
                throw new InvalidOperationException($"存档版本 v{version} 高于当前支持的 v{targetVersion}");

            while (version < targetVersion)
            {
                if (!_migrations.TryGetValue(version, out var migration))
                    throw new InvalidOperationException($"缺少 v{version} → v{version + 1} 的迁移函数");

                save = migration.Apply(save) ?? throw new InvalidOperationException($"v{version} 迁移返回空对象");
                version++;
                EnsureMeta(save)["schemaVersion"] = version;
            }

            return save;
        }

        public static int ReadVersion(JObject save)
        {
            var token = save?["meta"]?["schemaVersion"];
            if (token == null || token.Type == JTokenType.Null) return 0;
            return token.Value<int>();
        }

        private static JObject EnsureMeta(JObject save)
        {
            if (save["meta"] is JObject meta) return meta;
            meta = new JObject();
            save["meta"] = meta;
            return meta;
        }
    }
}
