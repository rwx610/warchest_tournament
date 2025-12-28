document.addEventListener("DOMContentLoaded", () => {

    const SHEET_ID = "1Fg3qeMKaFOhRpVl6OxgUKVWVvvGEjyQEpmZ-vCldebg";
    const TABLE_RANGES = {
        Standings: "A1:K9",       // Добавили колонку
        GroupMatches: "A12:D36",   // Сдвинули диапазон
        PlayoffMatches: "A38:E46",  // Расширили
        Leaderboard: "M1:N9"
    };

    /* ===== UI ===== */

    function toggleSchedule(id) {
        const el = document.getElementById(id);
        el.style.display =
            (el.style.display === 'none' || el.style.display === '')
                ? 'block'
                : 'none';
    }

    document.getElementById('toggleA')?.addEventListener('click', () => toggleSchedule('scheduleA'));
    document.getElementById('toggleB')?.addEventListener('click', () => toggleSchedule('scheduleB'));

    /* ===== DATA ===== */

    function fetchTable(range) {
        const url =
            `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq` +
            `?tqx=out:json&range=${range}`;

        return fetch(url)
            .then(res => res.text())
            .then(text => {
                const json = JSON.parse(
                    text.match(/google\.visualization\.Query\.setResponse\(([\s\S]+)\)/)[1]
                );

                const headers = json.table.cols.map(c => c.label);

                return json.table.rows.map(r => {
                    const obj = {};
                    r.c.forEach((cell, i) => {
                        obj[headers[i]] = cell ? cell.v : null;
                    });
                    return obj;
                });
            });
    }

    /* ===== RENDER ===== */

    function renderGroupTable(group, tableId, scheduleId, matches) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';

        group
            .sort((a, b) => a.Rank - b.Rank)
            .forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.Player}</td>
                    <td>${p.MP}</td>
                    <td>${p.W}</td>
                    <td>${p.D}</td>
                    <td>${p.L}</td>
                    <td>${p.Pts}</td>
                    <td>${p.Rank}</td>
                `;
                tbody.appendChild(tr);
            });

        renderGroupDetails(group[0].Group, scheduleId, matches);
    }

    function renderGroupDetails(groupKey, scheduleId, matches) {
        const container = document.getElementById(scheduleId);
        container.innerHTML = '';

        const groupMatches = matches.filter(m => m.ID.startsWith(groupKey));
        const matchIDs = [...new Set(groupMatches.map(m => m.ID))];

        matchIDs.forEach(id => {
            const [p1, p2] = groupMatches.filter(m => m.ID === id);
            if (!p1 || !p2) return;

            const div = document.createElement('div');
            div.className = 'match-details';
            div.innerHTML = `
                <p><strong>${p1.Player} ⚔️ ${p2.Player}</strong></p>
                <ul>
                    <li>${p1.G1 ?? 0} : ${p2.G1 ?? 0}</li>
                    <li>${p1.G2 ?? 0} : ${p2.G2 ?? 0}</li>
                </ul>
            `;
            container.appendChild(div);
        });
    }

    function renderPlayoff(tableId, matches, ids) {
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';

        ids.forEach(id => {
            const [p1, p2] = matches.filter(m => m.ID === id);
            if (!p1 || !p2) return;

            const score = ['G1','G2','G3']
                .map(g => `${p1[g] ?? 0}-${p2[g] ?? 0}`)
                .join(' ');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p1.Player}</td>
                <td>${score}</td>
                <td>${p2.Player}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    /* ===== INIT ===== */

    Promise.all([
        fetchTable(TABLE_RANGES.Standings),      // Standings
        fetchTable(TABLE_RANGES.GroupMatches),    // GroupMatches
        fetchTable(TABLE_RANGES.PlayoffMatches),     // PlayoffMatches
        fetchTable(TABLE_RANGES.Leaderboard)        // Leaderboard
    ])
    .then(([Standings, GroupMatches, PlayoffMatches, Leaderboard]) => {

        const groupA = Standings.filter(r => r.Group === 'A');
        const groupB = Standings.filter(r => r.Group === 'B');

        renderGroupTable(groupA, 'groupA', 'scheduleA', GroupMatches);
        renderGroupTable(groupB, 'groupB', 'scheduleB', GroupMatches);

        renderPlayoff('semifinal', PlayoffMatches, ['SF1', 'SF2']);
        renderPlayoff('third', PlayoffMatches, ['3RD']);
        renderPlayoff('final', PlayoffMatches, ['F']);
    })
    .catch(err => console.error('Load error:', err));
});
