using System;
using System.Collections.Generic;
using StellarSea.Data;
using StellarSea.Data.Config;

namespace StellarSea.Battle
{
    /// <summary>把 Config_CSV 导入的资产与存档阵容组装成 BattleSetup。</summary>
    public static class BattleFactory
    {
        public static BattleSetup CreateFromSave(
            ConfigDatabase db,
            SaveData save,
            string stageId,
            string seed = null)
        {
            if (db == null) throw new ArgumentNullException(nameof(db));
            if (save == null) throw new ArgumentNullException(nameof(save));

            var setup = new BattleSetup { seed = string.IsNullOrEmpty(seed) ? "1" : seed };
            LoadSkills(db, setup);

            var ships = new Dictionary<string, ShipInstance>(StringComparer.Ordinal);
            foreach (var ship in save.ships)
                if (ship != null && !string.IsNullOrEmpty(ship.instanceId)) ships[ship.instanceId] = ship;

            var order = new List<string>();
            foreach (var id in save.formation.front)
                if (id != save.formation.flagship) order.Add(id);
            foreach (var id in save.formation.back)
                if (id != save.formation.flagship) order.Add(id);

            // 教程/首次进入时阵容可能为空，用现有舰船补齐。
            if (order.Count == 0)
            {
                foreach (var ship in save.ships)
                    if (ship.instanceId != save.formation.flagship) order.Add(ship.instanceId);
            }

            int added = 0;
            foreach (var instanceId in order)
            {
                if (added >= 6) break;
                if (!ships.TryGetValue(instanceId, out var instance)) continue;
                var spec = BuildShipSpec(db, instance.configId);
                if (spec == null) continue;
                setup.allies.Add(spec);
                added++;
            }

            if (!string.IsNullOrEmpty(save.formation.flagship) && ships.TryGetValue(save.formation.flagship, out var flagship))
                setup.flagship = BuildShipSpec(db, flagship.configId);

            BuildEnemies(db, stageId, setup);
            return setup;
        }

        public static BattleSetup Create(
            ConfigDatabase db,
            string stageId,
            IReadOnlyList<string> allyConfigIds,
            string flagshipConfigId = null,
            string seed = null)
        {
            if (db == null) throw new ArgumentNullException(nameof(db));

            var setup = new BattleSetup { seed = string.IsNullOrEmpty(seed) ? "1" : seed };
            LoadSkills(db, setup);

            if (allyConfigIds != null)
            {
                foreach (var configId in allyConfigIds)
                {
                    if (setup.allies.Count >= 6) break;
                    var spec = BuildShipSpec(db, configId);
                    if (spec != null) setup.allies.Add(spec);
                }
            }
            if (!string.IsNullOrEmpty(flagshipConfigId))
                setup.flagship = BuildShipSpec(db, flagshipConfigId);

            BuildEnemies(db, stageId, setup);
            return setup;
        }

        public static UnitSpec BuildShipSpec(ConfigDatabase db, string configId)
        {
            var table = db.GetTable("ship");
            var row = table?.Find(configId);
            if (row == null) return null;

            return new UnitSpec
            {
                configId = configId,
                name = table.Get(row, "name"),
                side = BattleSide.Ally,
                hp = table.GetInt(row, "hp", 1),
                atk = table.GetInt(row, "atk", 1),
                def = table.GetInt(row, "def"),
                spd = table.GetInt(row, "spd", 100),
                critRate = table.GetInt(row, "critRate", 5),
                critDmg = table.GetInt(row, "critDmg", 150),
                rageSkillId = table.Get(row, "rageSkillId"),
                passiveSkillId = table.Get(row, "passiveSkillId"),
                exclusiveSkillId = table.Get(row, "exclusiveSkillId"),
                flagshipSkillId = table.Get(row, "flagshipSkillId"),
            };
        }

        public static UnitSpec BuildEnemySpec(ConfigDatabase db, string configId, float scale)
        {
            var table = db.GetTable("enemy");
            var row = table?.Find(configId);
            if (row == null) return null;

            if (scale <= 0) scale = 1f;
            return new UnitSpec
            {
                configId = configId,
                name = table.Get(row, "name"),
                side = BattleSide.Enemy,
                isBoss = table.GetBool(row, "isBoss"),
                hp = Scale(table.GetInt(row, "hp", 1), scale),
                atk = Scale(table.GetInt(row, "atk", 1), scale),
                def = Scale(table.GetInt(row, "def"), scale),
                spd = table.GetInt(row, "spd", 100),
                critRate = table.GetInt(row, "critRate", 5),
                critDmg = table.GetInt(row, "critDmg", 150),
                rageSkillId = table.Get(row, "skillId"),
            };
        }

        private static int Scale(int value, float scale)
        {
            return Math.Max(0, (int)Math.Round(value * scale));
        }

        private static void BuildEnemies(ConfigDatabase db, string stageId, BattleSetup setup)
        {
            var stageTable = db.GetTable("stage");
            var stage = stageTable?.Find(stageId);
            if (stage == null) return;

            float scale = stageTable.GetFloat(stage, "enemyScale", 1f);
            var lineup = stageTable.GetList(stage, "enemyLineup");
            foreach (var enemyId in lineup)
            {
                var spec = BuildEnemySpec(db, enemyId, scale);
                if (spec != null) setup.enemies.Add(spec);
            }
        }

        private static void LoadSkills(ConfigDatabase db, BattleSetup setup)
        {
            var table = db.GetTable("skill");
            if (table == null) return;

            foreach (var row in table.Rows)
            {
                var skill = new SkillSpec
                {
                    id = table.Get(row, "id"),
                    name = table.Get(row, "name"),
                    kind = ParseKind(table.Get(row, "type")),
                    trigger = ParseTrigger(table.Get(row, "trigger")),
                    target = ParseTarget(table.Get(row, "targetRule")),
                    condition = ParseCondition(table.Get(row, "condition")),
                    conditionValue = table.GetInt(row, "conditionValue"),
                    power = table.GetInt(row, "power"),
                    defPenetration = table.GetInt(row, "defPenetration"),
                    durationRounds = table.GetInt(row, "durationRounds"),
                    chance = table.GetInt(row, "chance", 100),
                };

                AddEffect(skill, table.Get(row, "effectType"), table.GetInt(row, "effectValue"));
                AddEffect(skill, table.Get(row, "effect2Type"), table.GetInt(row, "effect2Value"));
                AddEffect(skill, table.Get(row, "effect3Type"), table.GetInt(row, "effect3Value"));

                if (!string.IsNullOrEmpty(skill.id)) setup.skills[skill.id] = skill;
            }

            var comboTable = db.GetTable("combo");
            if (comboTable == null) return;
            foreach (var row in comboTable.Rows)
            {
                setup.combos.Add(new ComboSpec
                {
                    id = comboTable.Get(row, "id"),
                    skillId = comboTable.Get(row, "skillId"),
                    shipA = comboTable.Get(row, "shipA"),
                    shipB = comboTable.Get(row, "shipB"),
                    priority = comboTable.GetInt(row, "priority"),
                    oncePerBattle = comboTable.GetBool(row, "oncePerBattle"),
                });
            }
        }

        private static void AddEffect(SkillSpec skill, string type, int value)
        {
            var kind = ParseEffect(type);
            if (kind == EffectKind.None) return;
            skill.effects.Add(new EffectSpec { kind = kind, value = value });
        }

        private static SkillKind ParseKind(string value)
        {
            switch (value)
            {
                case "rage": return SkillKind.Rage;
                case "passive": return SkillKind.Passive;
                case "flagship": return SkillKind.Flagship;
                case "exclusive": return SkillKind.Exclusive;
                case "combo": return SkillKind.Combo;
                case "enemy": return SkillKind.Enemy;
                default: return SkillKind.None;
            }
        }

        private static TriggerKind ParseTrigger(string value)
        {
            switch (value)
            {
                case "rage_full": return TriggerKind.RageFull;
                case "always": return TriggerKind.Always;
                case "on_hit": return TriggerKind.OnHit;
                case "after_attack": return TriggerKind.AfterAttack;
                case "after_action": return TriggerKind.AfterAction;
                case "battle_start": return TriggerKind.BattleStart;
                case "round_3_then_4": return TriggerKind.Round3Then4;
                case "round_3_6_9": return TriggerKind.Round3_6_9;
                case "on_heal": return TriggerKind.OnHeal;
                case "combo": return TriggerKind.Combo;
                case "on_kill": return TriggerKind.OnKill;
                default: return TriggerKind.None;
            }
        }

        private static TargetRule ParseTarget(string value)
        {
            switch (value)
            {
                case "self": return TargetRule.Self;
                case "singleEnemy": return TargetRule.SingleEnemy;
                case "randomEnemy": return TargetRule.RandomEnemy;
                case "randomEnemy3": return TargetRule.RandomEnemy3;
                case "allEnemies": return TargetRule.AllEnemies;
                case "lowestAlly": return TargetRule.LowestAlly;
                case "allAllies": return TargetRule.AllAllies;
                case "backRowAllies": return TargetRule.BackRowAllies;
                case "highestHpEnemy": return TargetRule.HighestHpEnemy;
                default: return TargetRule.Self;
            }
        }

        private static ConditionKind ParseCondition(string value)
        {
            switch (value)
            {
                case "targetHpAbove": return ConditionKind.TargetHpAbove;
                case "targetHpBelow": return ConditionKind.TargetHpBelow;
                default: return ConditionKind.None;
            }
        }

        private static EffectKind ParseEffect(string value)
        {
            switch (value)
            {
                case "taunt": return EffectKind.Taunt;
                case "damageReduction": return EffectKind.DamageReduction;
                case "damageUp": return EffectKind.DamageUp;
                case "reflect": return EffectKind.Reflect;
                case "critRate": return EffectKind.CritRate;
                case "critDmg": return EffectKind.CritDmg;
                case "atkUp": return EffectKind.AtkUp;
                case "defUp": return EffectKind.DefUp;
                case "spdUp": return EffectKind.SpdUp;
                case "spdDown": return EffectKind.SpdDown;
                case "healUp": return EffectKind.HealUp;
                case "cleanse": return EffectKind.Cleanse;
                case "rageGain": return EffectKind.RageGain;
                case "stun": return EffectKind.Stun;
                case "dot": return EffectKind.Dot;
                case "shield": return EffectKind.Shield;
                case "immunity": return EffectKind.Immunity;
                default: return EffectKind.None;
            }
        }
    }
}
