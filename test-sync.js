const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSync() {
  const log = "[Gen 9] Monotype\nAmesoul sent out Klefki!\ndivinescooper sent out Ceruledge!\nTurn 1\nCeruledge used Bitter Blade!\nKlefki lost 100% of its health!\nAmesoul sent out Iron Treads!";
  
  console.log("Testing Battle Log Sync...");
  const res = await fetch('http://localhost:3001/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: `BATTLE_LOG_SYNC: ${log}` }],
      pokemonContext: [],
      userTeamContext: []
    })
  });
  
  const data = await res.json();
  console.log("Response Status:", res.status);
  console.log("Battle State:", JSON.stringify(data.battleState, null, 2));
  console.log("Content:", data.content);
}

testSync();
