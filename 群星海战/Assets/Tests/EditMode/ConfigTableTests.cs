using System.Collections.Generic;
using NUnit.Framework;
using StellarSea.Data.Config;
using UnityEngine;

namespace StellarSea.Tests.EditMode
{
    public sealed class ConfigTableTests
    {
        private readonly List<Object> _created = new List<Object>();

        private ConfigTableAsset NewTable()
        {
            var table = ScriptableObject.CreateInstance<ConfigTableAsset>();
            _created.Add(table);
            table.tableName = "building";
            table.idColumn = "id";
            table.headers = new[] { "id", "level", "cost" };
            table.rows = new List<ConfigRow>
            {
                new ConfigRow { values = new[] { "building_base", "1", "2000" } },
                new ConfigRow { values = new[] { "building_base", "2", "3200" } },
                new ConfigRow { values = new[] { "building_trade", "1", "5000" } },
            };
            table.RebuildIndex();
            return table;
        }

        [TearDown]
        public void TearDown()
        {
            foreach (var obj in _created)
                if (obj != null) Object.DestroyImmediate(obj);
            _created.Clear();
        }

        [Test]
        public void FindAll_ReturnsEveryRowSharingAnId()
        {
            var table = NewTable();
            var rows = table.FindAll("building_base");

            Assert.AreEqual(2, rows.Count);
            Assert.AreEqual("1", table.Get(rows[0], "level"));
            Assert.AreEqual("2", table.Get(rows[1], "level"));
        }

        [Test]
        public void Find_ReturnsFirstRowOfMultiRowId()
        {
            var table = NewTable();
            var row = table.Find("building_base");

            Assert.IsNotNull(row);
            Assert.AreEqual("2000", table.Get(row, "cost"));
        }

        [Test]
        public void FindAll_UnknownId_ReturnsEmpty()
        {
            var table = NewTable();
            Assert.AreEqual(0, table.FindAll("building_missing").Count);
            Assert.IsNull(table.Find("building_missing"));
        }

        [Test]
        public void ConfigDatabase_DelegatesLookupToTable()
        {
            var table = NewTable();
            var db = ScriptableObject.CreateInstance<ConfigDatabase>();
            _created.Add(db);
            db.tables = new List<ConfigTableAsset> { table };
            db.RebuildIndex();

            Assert.AreSame(table, db.GetTable("building"));
            Assert.AreEqual(2, db.FindAll("building", "building_base").Count);
            Assert.AreEqual("5000", db.Get("building", "building_trade", "cost"));
        }
    }
}
