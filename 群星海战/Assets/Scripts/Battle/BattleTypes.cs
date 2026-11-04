using System;
using System.Collections.Generic;

namespace StellarSea.Battle
{
    public enum BattleSide
    {
        Ally = 0,
        Enemy = 1,
    }

    public enum SkillKind
    {
        None,
        Rage,
        Passive,
        Flagship,
        Exclusive,
        Combo,
        Enemy,
    }

    public enum TriggerKind
    {
        None,
        RageFull,
        Always,
        OnHit,
        AfterAttack,
        AfterAction,
        BattleStart,
        Round3Then4,
        Round3_6_9,
        OnHeal,
        Combo,
        OnKill,
    }

    public enum TargetRule
    {
        Self,
        SingleEnemy,
        RandomEnemy,
        RandomEnemy3,
        AllEnemies,
        LowestAlly,
        AllAllies,
        BackRowAllies,
        HighestHpEnemy,
    }

    public enum EffectKind
    {
        None,
        Taunt,
        DamageReduction,
        DamageUp,
        Reflect,
        CritRate,
        CritDmg,
        AtkUp,
        DefUp,
        SpdUp,
        SpdDown,
        HealUp,
        Cleanse,
        RageGain,
        Stun,
        Dot,
        Shield,
        Immunity,
    }

    /// <summary>技能条件：v1 只做目标血量区间与击杀触发。</summary>
    public enum ConditionKind
    {
        None,
        TargetHpAbove,
        TargetHpBelow,
    }

    public enum BattleEventKind
    {
        BattleStarted,
        RoundStarted,
        ActionStarted,
        BasicAttack,
        SkillCast,
        ComboCast,
        FlagshipCast,
        Damage,
        Heal,
        ShieldGained,
        BuffApplied,
        BuffExpired,
        UnitDied,
        BattleEnded,
    }

    [Serializable]
    public sealed class EffectSpec
    {
        public EffectKind kind;
        public int value;
    }

    [Serializable]
    public sealed class SkillSpec
    {
        public string id = string.Empty;
        public string name = string.Empty;
        public SkillKind kind = SkillKind.None;
        public TriggerKind trigger = TriggerKind.None;
        public TargetRule target = TargetRule.Self;
        public ConditionKind condition = ConditionKind.None;
        public int conditionValue;
        public int power;
        public int defPenetration;
        public int durationRounds;
        public int chance = 100;
        public bool oncePerBattle;
        public readonly List<EffectSpec> effects = new List<EffectSpec>();

        public bool HasEffect(EffectKind kind)
        {
            foreach (var e in effects)
                if (e.kind == kind) return true;
            return false;
        }

        public int EffectValue(EffectKind kind)
        {
            foreach (var e in effects)
                if (e.kind == kind) return e.value;
            return 0;
        }
    }

    [Serializable]
    public sealed class ComboSpec
    {
        public string id = string.Empty;
        public string skillId = string.Empty;
        public string shipA = string.Empty;
        public string shipB = string.Empty;
        public int priority;
        public bool oncePerBattle = true;
    }

    /// <summary>舰船/敌人的静态面板。战斗内不做养成计算，M1 直接读基础值。</summary>
    [Serializable]
    public sealed class UnitSpec
    {
        public string configId = string.Empty;
        public string name = string.Empty;
        public BattleSide side;
        public bool isBoss;
        public int hp;
        public int atk;
        public int def;
        public int spd;
        public int critRate = 5;
        public int critDmg = 150;
        public string rageSkillId = string.Empty;
        public string passiveSkillId = string.Empty;
        public string exclusiveSkillId = string.Empty;
        public string flagshipSkillId = string.Empty;
    }

    [Serializable]
    public sealed class ActiveBuff
    {
        public EffectKind kind;
        public int value;
        public string sourceId = string.Empty;
        public double appliedAt;
        /// <summary>时间轴到期点；&lt;0 表示永久。</summary>
        public double expireAt = -1;
        public int stacks = 1;
        public bool debuff;
        public bool dispellable = true;
        /// <summary>护盾/免疫等一次性效果的剩余量或次数。</summary>
        public int pool;
    }

    [Serializable]
    public sealed class BattleEvent
    {
        public BattleEventKind kind;
        public int round;
        public double time;
        public string actorId = string.Empty;
        public string targetId = string.Empty;
        public string skillId = string.Empty;
        public int value;
        public int targetHp;
        public string note = string.Empty;

        public override string ToString()
        {
            return $"[{round}] {kind} {actorId}->{targetId} {value} {note}";
        }
    }

    public sealed class BattleResult
    {
        public bool victory;
        public bool timeout;
        public int rounds;
        public int allyDeaths;
        public int enemyDeaths;
        public string seed = string.Empty;
        public readonly List<BattleEvent> events = new List<BattleEvent>();
    }
}
