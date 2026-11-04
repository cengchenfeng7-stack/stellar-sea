using System;
using System.Collections.Generic;
using System.IO;
using StellarSea.Data.Config;
using UnityEditor;
using UnityEngine;

namespace StellarSea.Editor
{
    /// <summary>
    /// Config_CSV → ScriptableObject 导入工具。
    /// CSV 在仓库根目录（Unity 工程之外），只在编辑器里读取，不参与运行时打包。
    /// </summary>
    public static class ConfigCsvImporter
    {
        private const string GeneratedDir = "Assets/Config/Generated";
        private const string ConfigDir = "Assets/Config";
        private const string DatabasePath = "Assets/Config/ConfigDatabase.asset";

        private static readonly string[] IdColumnCandidates = { "id", "poolId", "lootTableId", "key" };

        private static readonly string[] RequiredTables =
        {
            "ship", "captain", "skill", "combo", "equip", "enemy", "stage", "loot",
            "port", "good", "route", "gacha", "building", "tech", "buff", "event",
            "task", "audio", "localization", "economy",
        };

        [MenuItem("Tools/StellarSea/Import Config CSV", priority = 1)]
        public static void ImportAll()
        {
            string csvDir = ResolveCsvDirectory();
            if (csvDir == null) return;

            EnsureFolder(ConfigDir);
            EnsureFolder(GeneratedDir);

            var files = Directory.GetFiles(csvDir, "*.csv");
            Array.Sort(files, StringComparer.Ordinal);

            var tables = new List<ConfigTableAsset>();
            int totalRows = 0;
            int errors = 0;

            foreach (string file in files)
            {
                string tableName = Path.GetFileNameWithoutExtension(file);
                List<string[]> parsed;
                try
                {
                    parsed = CsvParser.Parse(File.ReadAllText(file));
                }
                catch (Exception ex)
                {
                    Debug.LogError($"[Config] 读取 {tableName}.csv 失败：{ex.Message}");
                    errors++;
                    continue;
                }

                if (parsed.Count == 0)
                {
                    Debug.LogError($"[Config] {tableName}.csv 为空");
                    errors++;
                    continue;
                }

                string[] headers = parsed[0];
                if (headers.Length == 0 || string.IsNullOrEmpty(headers[0]))
                {
                    Debug.LogError($"[Config] {tableName}.csv 表头为空");
                    errors++;
                    continue;
                }

                var rows = new List<ConfigRow>();
                string idColumn = PickIdColumn(headers);
                int idIndex = Array.IndexOf(headers, idColumn);

                for (int i = 1; i < parsed.Count; i++)
                {
                    string[] values = parsed[i];
                    if (values.Length != headers.Length)
                    {
                        Debug.LogError($"[Config] {tableName}.csv 第 {i + 1} 行列数 {values.Length} != 表头 {headers.Length}");
                        errors++;
                        continue;
                    }

                    // id 可以重复：building 按等级、loot 按条目、gacha 按概率项都是一 id 多行。
                    // 单行唯一性由 Tools/validate_config.mjs 按表规则校验。
                    if (idIndex >= 0 && string.IsNullOrEmpty(values[idIndex]))
                    {
                        Debug.LogError($"[Config] {tableName}.csv 第 {i + 1} 行 {idColumn} 为空");
                        errors++;
                    }

                    rows.Add(new ConfigRow { values = values });
                }

                string assetPath = $"{GeneratedDir}/{tableName}.asset";
                var asset = AssetDatabase.LoadAssetAtPath<ConfigTableAsset>(assetPath);
                if (asset == null)
                {
                    asset = ScriptableObject.CreateInstance<ConfigTableAsset>();
                    AssetDatabase.CreateAsset(asset, assetPath);
                }

                asset.tableName = tableName;
                asset.idColumn = idColumn;
                asset.headers = headers;
                asset.rows = rows;
                asset.RebuildIndex();
                EditorUtility.SetDirty(asset);

                tables.Add(asset);
                totalRows += rows.Count;
            }

            foreach (string required in RequiredTables)
            {
                if (!tables.Exists(t => t.tableName == required))
                {
                    Debug.LogError($"[Config] 缺少必需表：{required}.csv");
                    errors++;
                }
            }

            var database = AssetDatabase.LoadAssetAtPath<ConfigDatabase>(DatabasePath);
            if (database == null)
            {
                database = ScriptableObject.CreateInstance<ConfigDatabase>();
                AssetDatabase.CreateAsset(database, DatabasePath);
            }

            database.tables = tables;
            database.RebuildIndex();
            EditorUtility.SetDirty(database);

            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();

            if (errors == 0)
                Debug.Log($"[Config] 导入完成：{tables.Count} 张表 / {totalRows} 行 → {GeneratedDir}");
            else
                Debug.LogError($"[Config] 导入完成但有 {errors} 个错误，请先修复 CSV。");
        }

        [MenuItem("Tools/StellarSea/Validate Config CSV", priority = 2)]
        public static void ValidateAll()
        {
            string csvDir = ResolveCsvDirectory();
            if (csvDir == null) return;

            var files = Directory.GetFiles(csvDir, "*.csv");
            int errors = 0;
            int rows = 0;

            foreach (string file in files)
            {
                string tableName = Path.GetFileNameWithoutExtension(file);
                var parsed = CsvParser.Parse(File.ReadAllText(file));
                if (parsed.Count == 0)
                {
                    Debug.LogError($"[Config] {tableName}.csv 为空");
                    errors++;
                    continue;
                }

                string[] headers = parsed[0];
                string idColumn = PickIdColumn(headers);
                int idIndex = Array.IndexOf(headers, idColumn);

                for (int i = 1; i < parsed.Count; i++)
                {
                    rows++;
                    if (parsed[i].Length != headers.Length)
                    {
                        Debug.LogError($"[Config] {tableName}.csv 第 {i + 1} 行列数不匹配");
                        errors++;
                        continue;
                    }
                    // 允许一 id 多行（building/loot/gacha），唯一性规则交给 node 校验器。
                    if (idIndex >= 0 && string.IsNullOrEmpty(parsed[i][idIndex]))
                    {
                        Debug.LogError($"[Config] {tableName}.csv 第 {i + 1} 行 id 为空");
                        errors++;
                    }
                }
            }

            foreach (string required in RequiredTables)
            {
                if (!File.Exists(Path.Combine(csvDir, required + ".csv")))
                {
                    Debug.LogError($"[Config] 缺少必需表：{required}.csv");
                    errors++;
                }
            }

            if (errors == 0)
                Debug.Log($"[Config] 结构校验通过：{files.Length} 张表 / {rows} 行。完整规则请再跑 node Tools/validate_config.mjs");
            else
                Debug.LogError($"[Config] 结构校验发现 {errors} 个错误。");
        }

        private static string ResolveCsvDirectory()
        {
            // Assets 的上一级是 Unity 工程，再上一级是仓库根。
            string repoRoot = Path.GetFullPath(Path.Combine(Application.dataPath, "..", ".."));
            string csvDir = Path.Combine(repoRoot, "Config_CSV");
            if (!Directory.Exists(csvDir))
            {
                Debug.LogError($"[Config] 找不到 Config_CSV 目录：{csvDir}");
                return null;
            }
            return csvDir;
        }

        private static string PickIdColumn(string[] headers)
        {
            foreach (string candidate in IdColumnCandidates)
                if (Array.IndexOf(headers, candidate) >= 0) return candidate;
            return headers.Length > 0 ? headers[0] : "id";
        }

        private static void EnsureFolder(string path)
        {
            if (AssetDatabase.IsValidFolder(path)) return;
            string parent = Path.GetDirectoryName(path)?.Replace('\\', '/');
            string name = Path.GetFileName(path);
            if (string.IsNullOrEmpty(parent) || string.IsNullOrEmpty(name)) return;
            EnsureFolder(parent);
            AssetDatabase.CreateFolder(parent, name);
        }
    }
}
