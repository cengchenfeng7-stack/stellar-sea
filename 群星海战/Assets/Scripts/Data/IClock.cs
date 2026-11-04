using System;

namespace StellarSea.Data
{
    /// <summary>可注入的时间服务，便于测试离线结算与时钟回拨。</summary>
    public interface IClock
    {
        /// <summary>UTC Unix 毫秒。</summary>
        long UtcNowMs { get; }
    }

    public sealed class SystemClock : IClock
    {
        public long UtcNowMs => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    }

    /// <summary>测试用固定/可调时钟。</summary>
    public sealed class ManualClock : IClock
    {
        private long _nowMs;

        public ManualClock(long nowMs = 0) { _nowMs = nowMs; }

        public long UtcNowMs
        {
            get => _nowMs;
            set => _nowMs = value;
        }

        public void Advance(TimeSpan delta) => _nowMs += (long)delta.TotalMilliseconds;
    }
}
