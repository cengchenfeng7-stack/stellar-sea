using System;
using System.Collections.Generic;
using UnityEngine;

namespace StellarSea.Data.Config
{
    /// <summary>所有配置表的运行时索引。由 Tools/StellarSea/Import Config CSV 生成。</summary>
    [CreateAssetMenu(menuName = "StellarSea/Config Database", fileName = "ConfigDatabase")]
    public sealed class ConfigDatabase : ScriptableObject
    {
        public List<ConfigTableAsset> tables = new List<ConfigTableAsset>();

        private Dictionary<string, ConfigTableAsset> _byName;

        private void OnEnable() => RebuildIndex();
        private void OnValidate() => RebuildIndex();

        public void RebuildIndex()
        {
            _byName = new Dictionary<string, ConfigTableAsset>(StringComparer.Ordinal);
            foreach (var t in tables)
            {
                if (t == null || string.IsNullOrEmpty(t.tableName)) continue;
                _byName[t.tableName] = t;
            }
        }

        public ConfigTableAsset GetTable(string tableName)
        {
            if (_byName == null) RebuildIndex();
            return _byName != null && _byName.TryGetValue(tableName, out var t) ? t : null;
        }

        public ConfigRow Find(string tableName, string id)
        {
            var table = GetTable(tableName);
            return table != null ? table.Find(id) : null;
        }

        public IReadOnlyList<ConfigRow> FindAll(string tableName, string id)
        {
            var table = GetTable(tableName);
            return table != null ? table.FindAll(id) : Array.Empty<ConfigRow>();
        }

        public string Get(string tableName, string id, string column)
        {
            var table = GetTable(tableName);
            return table != null ? table.Get(table.Find(id), column) : string.Empty;
        }
    }
}
