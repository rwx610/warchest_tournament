document.addEventListener("DOMContentLoaded", () => {
    const SHEET_ID = "1Fg3qeMKaFOhRpVl6OxgUKVWVvvGEjyQEpmZ-vCldebg"; // вставьте ID своей таблицы
    const API_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    // Utility: toggle Details
    function toggleSchedule(id) {
        const el = document.getElementById(id);
        el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    }

    document.getElementById('toggleA').addEventListener('click', () => toggleSchedule('scheduleA'));
    document.getElementById('toggleB').addEventListener('click', () => toggleSchedule('scheduleB'));

    // Fetch gviz/tq data
    fetch(API_URL)
        .then(res => res.text())
        .then(text => {
            // Убираем лишнее оборачивание JSON
            const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/)[1]);
            const rows = json.table.rows;
            const cols = json.table.cols.map(c => c.label);

            // Преобразуем в массив объектов
            const data = rows.map(r => {
                const obj = {};
                r.c.forEach((cell, i) => {
                    obj[cols[i]] = cell ? cell.v : null;
                });
                return obj;
            });

            // Разделяем на группы и плейофф
            const groupA = data.filter(r => r.Group === 'A');
            const groupB = data.filter(r => r.Group === 'B');
            const playoff = data.filter(r => r.Group === 'PLAYOFF');

            // === Групповые таблицы ===
            function renderGroupTable(group, tableId, scheduleId) {
                const tbody = document.querySelector(`#${tableId} tbody`);
                tbody.innerHTML = '';

                // Сортировка по Rank
                group.sort((a, b) => a.Rank - b.Rank);

                group.forEach(player => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${player.Player}</td>
                        <td>${player.MP}</td>
                        <td>${player.W}</td>
                        <td>${player.D}</td>
                        <td>${player.L}</td>
                        <td>${player.Pts}</td>
                        <td>${player.Rank}</td>
                    `;
                    tbody.appendChild(row);
                });

                // === Расписание матчей Details ===
                const scheduleDiv = document.getElementById(scheduleId);
                scheduleDiv.innerHTML = '';
                const mIDs = [...new Set(group.map(r => r.M_ID))];

                mIDs.forEach(id => {
                    const matchRows = group.filter(r => r.M_ID === id);
                    const matchDiv = document.createElement('div');
                    matchDiv.classList.add('match-details');

                    const scores = matchRows.map(r => {
                        let games = ['G1','G2','G3'].map(g => r[g] !== null ? r[g] : '').join(' : ');
                        return `<li>${r.Player} - ${games}</li>`;
                    }).join('');

                    matchDiv.innerHTML = `<p><strong>Match ${id}</strong></p><ul>${scores}</ul>`;
                    scheduleDiv.appendChild(matchDiv);
                });
            }

            renderGroupTable(groupA, 'groupA', 'scheduleA');
            renderGroupTable(groupB, 'groupB', 'scheduleB');

            // === Плейофф ===
            function renderPlayoffTable(stageId, mIDs) {
                const tbody = document.querySelector(`#${stageId} tbody`);
                tbody.innerHTML = '';
                mIDs.forEach(id => {
                    const matchRows = playoff.filter(r => r.M_ID === id);
                    if (matchRows.length !== 2) return;

                    const row = document.createElement('tr');
                    const p1 = matchRows[0].Player;
                    const p2 = matchRows[1].Player;
                    const score = ['G1','G2','G3'].map(g => `${matchRows[0][g] || ''}-${matchRows[1][g] || ''}`).join(' ');

                    row.innerHTML = `<td>${p1}</td><td>${score}</td><td>${p2}</td>`;
                    tbody.appendChild(row);
                });
            }

            renderPlayoffTable('semifinal', ['SF1','SF2']);
            renderPlayoffTable('third', ['3RD']);
            renderPlayoffTable('final', ['F']);
        })
        .catch(err => console.error('Ошибка загрузки данных:', err));
});
