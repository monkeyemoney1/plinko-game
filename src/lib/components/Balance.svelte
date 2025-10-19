<script lang="ts">
  import { balance } from '$lib/stores/game';
  import { flyAndScale } from '$lib/utils/transitions';
  import { Popover } from 'bits-ui';

  let balanceFormatted = $derived(
    $balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
  );

  const addMoneyAmounts = [100, 500, 1000];
</script>

<div class="flex overflow-hidden rounded-md">
  <div
    class="flex gap-2 bg-slate-900 px-3 py-2 text-sm font-semibold text-white tabular-nums sm:text-base"
  >
  <span class="text-yellow-400 select-none">⭐️</span>
    <span class="min-w-16 text-right">
      {balanceFormatted}
    </span>
  </div>
  <button
    class="bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 active:bg-blue-700 sm:text-base rounded-md ml-2"
    disabled={false}
    type="button"
  >
  +
  </button>
</div>
