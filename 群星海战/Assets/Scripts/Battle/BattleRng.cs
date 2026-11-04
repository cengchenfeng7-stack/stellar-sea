using System;

namespace StellarSea.Battle
{
    /// <summary>
    /// 自写确定性 RNG（xorshift64*）。战斗只依赖 seed，不使用 UnityEngine.Random，
    /// 保证同平台同种子同阵容结果一致（设计文档 5.9）。
    /// </summary>
    public sealed class BattleRng
    {
        private ulong _state;

        public BattleRng(ulong seed)
        {
            // 0 是 xorshift 的不动点，替换成固定常量。
            _state = seed == 0 ? 0x9E3779B97F4A7C15UL : seed;
        }

        public ulong NextULong()
        {
            _state ^= _state >> 12;
            _state ^= _state << 25;
            _state ^= _state >> 27;
            return _state * 0x2545F4914F6CDD1DUL;
        }

        /// <summary>返回 [0, maxExclusive) 的整数。</summary>
        public int NextInt(int maxExclusive)
        {
            if (maxExclusive <= 1) return 0;
            return (int)(NextULong() % (ulong)maxExclusive);
        }

        /// <summary>[0, 100] 的百分比检定。</summary>
        public bool Chance(int percent)
        {
            if (percent <= 0) return false;
            if (percent >= 100) return true;
            return NextInt(100) < percent;
        }

        public static ulong SeedFromString(string seed)
        {
            if (string.IsNullOrEmpty(seed)) return 1UL;
            ulong h = 14695981039346656037UL;
            foreach (char c in seed)
            {
                h ^= c;
                h *= 1099511628211UL;
            }
            return h;
        }
    }
}
