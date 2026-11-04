using System;
using System.Collections.Generic;

namespace StellarSea.Battle
{
    /// <summary>战斗内单位。表现层只读，不直接改字段。</summary>
    public sealed class BattleUnit
    {
        public readonly UnitSpec spec;
        public readonly string unitId;
        public readonly BattleSide side;
        public readonly int row;      // 0 前排 / 1 后排
        public readonly int slot;     // 同排内的顺序，用于同速裁决

        public int maxHp;
        public int hp;
        public int shield;
        public int rage;
        public double actionValue;
        public bool alive = true;

        public readonly List<ActiveBuff> buffs = new List<ActiveBuff>();

        public BattleUnit(UnitSpec spec, string unitId, int row, int slot)
        {
            this.spec = spec;
            this.unitId = unitId;
            side = spec.side;
            this.row = row;
            this.slot = slot;
            maxHp = Math.Max(1, spec.hp);
            hp = maxHp;
            actionValue = Speed > 0 ? 10000.0 / Speed : double.MaxValue;
        }

        public bool IsAlly => side == BattleSide.Ally;

        public float HpRatio => maxHp <= 0 ? 0f : (float)hp / maxHp;

        public int Atk => Math.Max(0, spec.atk + PercentOf(spec.atk, Sum(EffectKind.AtkUp)));

        public int Def => Math.Max(0, spec.def + PercentOf(spec.def, Sum(EffectKind.DefUp)));

        public int Speed
        {
            get
            {
                int delta = Sum(EffectKind.SpdUp) - Sum(EffectKind.SpdDown);
                int value = spec.spd + PercentOf(spec.spd, delta);
                return Math.Max(1, value);
            }
        }

        public int CritRate => Clamp(spec.critRate + Sum(EffectKind.CritRate), 0, 100);

        public int CritDmg => Clamp(spec.critDmg + Sum(EffectKind.CritDmg), 0, 300);

        public int DamageUp => Clamp(Sum(EffectKind.DamageUp), 0, 200);

        public int DamageReduction => Clamp(Sum(EffectKind.DamageReduction), 0, 75);

        public int HealUp => Sum(EffectKind.HealUp);

        public bool IsStunned => Has(EffectKind.Stun);

        public bool Has(EffectKind kind)
        {
            foreach (var b in buffs)
                if (b.kind == kind && (b.kind != EffectKind.Shield || b.pool > 0)) return true;
            return false;
        }

        public ActiveBuff Find(EffectKind kind)
        {
            for (int i = buffs.Count - 1; i >= 0; i--)
                if (buffs[i].kind == kind) return buffs[i];
            return null;
        }

        public int Sum(EffectKind kind)
        {
            int total = 0;
            foreach (var b in buffs)
            {
                if (b.kind != kind) continue;
                if (kind == EffectKind.Shield && b.pool <= 0) continue;
                total += b.value * b.stacks;
            }
            return total;
        }

        /// <summary>嘲讽者取最后施放者（设计文档 5.9）。</summary>
        public ActiveBuff TauntBuff
        {
            get
            {
                ActiveBuff latest = null;
                foreach (var b in buffs)
                    if (b.kind == EffectKind.Taunt && (latest == null || b.appliedAt >= latest.appliedAt))
                        latest = b;
                return latest;
            }
        }

        public void AddBuff(ActiveBuff buff)
        {
            // 同来源同类默认刷新，不叠层；明确允许叠层的（潮汐祝福）由调用方设 stacks。
            for (int i = 0; i < buffs.Count; i++)
            {
                var existing = buffs[i];
                if (existing.kind != buff.kind || existing.sourceId != buff.sourceId) continue;
                if (buff.kind == EffectKind.Shield)
                {
                    existing.pool += buff.pool;
                    existing.value += buff.value;
                    existing.expireAt = Math.Max(existing.expireAt, buff.expireAt);
                    return;
                }
                existing.value = buff.value;
                existing.appliedAt = buff.appliedAt;
                existing.expireAt = buff.expireAt;
                return;
            }
            buffs.Add(buff);
        }

        public void RemoveBuff(ActiveBuff buff)
        {
            buffs.Remove(buff);
        }

        public int RemoveDebuffs(int max)
        {
            int removed = 0;
            for (int i = buffs.Count - 1; i >= 0 && removed < max; i--)
            {
                if (!buffs[i].debuff || !buffs[i].dispellable) continue;
                buffs.RemoveAt(i);
                removed++;
            }
            return removed;
        }

        private static int PercentOf(int baseValue, int percent)
        {
            return (int)Math.Floor(baseValue * (percent / 100.0));
        }

        private static int Clamp(int value, int min, int max)
        {
            return value < min ? min : value > max ? max : value;
        }
    }
}
