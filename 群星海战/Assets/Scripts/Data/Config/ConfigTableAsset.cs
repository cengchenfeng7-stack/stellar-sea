using System;
using System.Collections.Generic;
using UnityEngine;

namespace StellarSea.Data.Config
{
    /// <summary>
    /// 一张 CSV 表导入后的 ScriptableObject 形态。
    /// 泛型行 + 表头，避免为 20 张表各写一个类；需要强类型时再加访问器。
    /// </summary>
    [CreateAssetMenu(menuName = "StellarSea/Config Table", fileName = "ConfigTable")]
    public sealed class ConfigTableAsset : ScriptableObject
    {
        [Tooltip("表名，与 CSV 文件名一致")]
        public string tableName;

        [Tooltip("id 列名：id / poolId / lootTableId / key")]
        public string idColumn = "id";

        public string[] headers = Array.Empty<string>();
        public List<ConfigRow> rows = new List<ConfigRow>();

        private Dictionary<string, int> _headerIndex;
        private Dictionary<string, List<ConfigRow>> _idIndex;

        public IReadOnlyList<ConfigRow> Rows => rows;

        private void OnEnable() => RebuildIndex();
        private void OnValidate() => RebuildIndex();

        public void RebuildIndex()
        {
            _headerIndex = new Dictionary<string, int>(StringComparer.Ordinal);
            for (int i = 0; i < headers.Length; i++)
                _headerIndex[headers[i]] = i;

            // 一张表里同一个 id 可能有多行：building 按等级、loot 按掉落条目、
            // gacha 按卡池概率条目，因此索引存列表而不是单行。
            _idIndex = new Dictionary<string, List<ConfigRow>>(StringComparer.Ordinal);
            int idIdx = ColumnIndex(idColumn);
            if (idIdx < 0) return;
            foreach (var row in rows)
            {
                if (row == null || row.values == null || idIdx >= row.values.Length) continue;
                string id = row.values[idIdx];
                if (string.IsNullOrEmpty(id)) continue;
                if (!_idIndex.TryGetValue(id, out var list))
                {
                    list = new List<ConfigRow>(1);
                    _idIndex[id] = list;
                }
                list.Add(row);
            }
        }

        public int ColumnIndex(string column)
        {
            if (_headerIndex == null) RebuildIndex();
            return _headerIndex != null && _headerIndex.TryGetValue(column, out int idx) ? idx : -1;
        }

        /// <summary>取该 id 的第一行；多行表请用 FindAll。</summary>
        public ConfigRow Find(string id)
        {
            if (_idIndex == null) RebuildIndex();
            return _idIndex != null && _idIndex.TryGetValue(id, out var list) && list.Count > 0 ? list[0] : null;
        }

        /// <summary>取该 id 的全部行，用于 building / loot / gacha 这类多行表。</summary>
        public IReadOnlyList<ConfigRow> FindAll(string id)
        {
            if (_idIndex == null) RebuildIndex();
            return _idIndex != null && _idIndex.TryGetValue(id, out var list)
                ? list
                : Array.Empty<ConfigRow>();
        }

        public string Get(ConfigRow row, string column)
        {
            int idx = ColumnIndex(column);
            if (row == null || row.values == null || idx < 0 || idx >= row.values.Length) return string.Empty;
            return row.values[idx];
        }

        public int GetInt(ConfigRow row, string column, int fallback = 0)
        {
            return int.TryParse(Get(row, column), out int v) ? v : fallback;
        }

        public long GetLong(ConfigRow row, string column, long fallback = 0)
        {
            return long.TryParse(Get(row, column), out long v) ? v : fallback;
        }

        public float GetFloat(ConfigRow row, string column, float fallback = 0f)
        {
            return float.TryParse(Get(row, column), out float v) ? v : fallback;
        }

        public bool GetBool(ConfigRow row, string column)
        {
            string v = Get(row, column);
            return v == "1" || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>按 | 拆分的列表字段。</summary>
        public string[] GetList(ConfigRow row, string column)
        {
            string v = Get(row, column);
            return string.IsNullOrEmpty(v) ? Array.Empty<string>() : v.Split('|');
        }
    }

    [Serializable]
    public sealed class ConfigRow
    {
        public string[] values = Array.Empty<string>();
    }
}
