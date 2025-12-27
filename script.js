document.addEventListener("DOMContentLoaded", () => {
    const SHEET_ID = "1Fg3qeMKaFOhRpVl6OxgUKVWVvvGEjyQEpmZ-vCldebg";
    const API_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;

    // Utility: toggle Details
    function toggleSchedule(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
        }
    }

    // Функция для создания кнопок Details
    function createToggleButtons() {
        // Создаем контейнеры для кнопок, если их нет
        const groupAContainer = document.querySelector('#groupA');
        const groupBContainer = document.querySelector('#groupB');
        
        if (!groupAContainer || !groupBContainer) return;
        
        // Добавляем кнопку для группы A
        let toggleA = document.getElementById('toggleA');
        if (!toggleA) {
            toggleA = document.createElement('button');
            toggleA.id = 'toggleA';
            toggleA.textContent = 'Details Group A';
            toggleA.className = 'toggle-btn';
            // Вставляем после таблицы группы A
            groupAContainer.parentNode.insertBefore(toggleA, groupAContainer.nextSibling);
        }
        
        // Добавляем кнопку для группы B
        let toggleB = document.getElementById('toggleB');
        if (!toggleB) {
            toggleB = document.createElement('button');
            toggleB.id = 'toggleB';
            toggleB.textContent = 'Details Group B';
            toggleB.className = 'toggle-btn';
            // Вставляем после таблицы группы B
            groupBContainer.parentNode.insertBefore(toggleB, groupBContainer.nextSibling);
        }
        
        // Добавляем обработчики
        toggleA.addEventListener('click', () => toggleSchedule('scheduleA'));
        toggleB.addEventListener('click', () => toggleSchedule('scheduleB'));
        
        // Изначально скрываем детали матчей
        const scheduleA = document.getElementById('scheduleA');
        const scheduleB = document.getElementById('scheduleB');
        if (scheduleA) scheduleA.style.display = 'none';
        if (scheduleB) scheduleB.style.display = 'none';
    }

    // Fetch gviz/tq data
    fetch(API_URL)
        .then(res => res.text())
        .then(text => {
            // Безопасный парсинг JSON
            const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w]+)\)/);
            if (!match) {
                throw new Error('Некорректный формат ответа от Google Sheets');
            }
            
            const json = JSON.parse(match[1]);
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

            // Таблицы (standings)
            const groupA = data.filter(r => r.Group === 'A' && r.Rank !== null);
            const groupB = data.filter(r => r.Group === 'B' && r.Rank !== null);

            // Матчи (details)
            const groupMatchesA = data.filter(r => /^A\d+$/.test(r.M_ID));
            const groupMatchesB = data.filter(r => /^B\d+$/.test(r.M_ID));

            // Плейофф
            const playoff = data.filter(r => r.Group === 'PLAYOFF');

            // === Групповые таблицы ===
            function renderGroupTable(group, tableId) {
                const tbody = document.querySelector(`#${tableId} tbody`);
                if (!tbody) return;
                
                tbody.innerHTML = '';

                // Сортировка по Rank
                group.sort((a, b) => (a.Rank || 0) - (b.Rank || 0));

                group.forEach(player => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${player.Player || ''}</td>
                        <td>${player.MP || 0}</td>
                        <td>${player.W || 0}</td>
                        <td>${player.D || 0}</td>
                        <td>${player.L || 0}</td>
                        <td>${player.Pts || 0}</td>
                        <td>${player.Rank || ''}</td>
                    `;
                    tbody.appendChild(row);
                });
            }

            function renderGroupDetails(rows, scheduleId) {
                const container = document.getElementById(scheduleId);
                if (!container) return;
                
                container.innerHTML = '';

                // Группируем по M_ID
                const matches = {};
                rows.forEach(row => {
                    if (row.M_ID) {
                        if (!matches[row.M_ID]) {
                            matches[row.M_ID] = [];
                        }
                        matches[row.M_ID].push(row);
                    }
                });

                // Отображаем каждый матч
                Object.entries(matches)
                    .sort((a, b) => a[0].localeCompare(b[0])) // Сортируем по номеру матча
                    .forEach(([matchId, players]) => {
                        if (players.length < 2) return;
                        
                        const [p1, p2] = players;
                        const g1_1 = p1.G1 ?? 0;
                        const g1_2 = p2.G1 ?? 0;
                        const g2_1 = p1.G2 ?? 0;
                        const g2_2 = p2.G2 ?? 0;

                        const matchDiv = document.createElement('div');
                        matchDiv.className = 'match-details';

                        matchDiv.innerHTML = `
                            <p><strong>Match ${matchId}: ${p1.Player || ''} ⚔️ ${p2.Player || ''}</strong></p>
                            <ul>
                                <li>Set 1: ${g1_1} : ${g1_2}</li>
                                <li>Set 2: ${g2_1} : ${g2_2}</li>
                                ${p1.G3 !== null ? `<li>Set 3: ${p1.G3 ?? 0} : ${p2.G3 ?? 0}</li>` : ''}
                            </ul>
                        `;

                        container.appendChild(matchDiv);
                    });
            }

            // Рендерим данные
            renderGroupTable(groupA, 'groupA');
            renderGroupTable(groupB, 'groupB');

            renderGroupDetails(groupMatchesA, 'scheduleA');
            renderGroupDetails(groupMatchesB, 'scheduleB');

            // === Плейофф ===
            function renderPlayoffTable(stageId, mIDs) {
                const tbody = document.querySelector(`#${stageId} tbody`);
                if (!tbody) return;
                
                tbody.innerHTML = '';
                mIDs.forEach(id => {
                    const matchRows = playoff.filter(r => r.M_ID === id);
                    if (matchRows.length !== 2) return;

                    const row = document.createElement('tr');
                    const p1 = matchRows[0].Player || '';
                    const p2 = matchRows[1].Player || '';
                    const score = ['G1','G2','G3']
                        .map(g => {
                            const val1 = matchRows[0][g] || '';
                            const val2 = matchRows[1][g] || '';
                            return `${val1}-${val2}`;
                        })
                        .filter(s => s !== '-') // Убираем пустые сеты
                        .join(' ');

                    row.innerHTML = `<td>${p1}</td><td>${score}</td><td>${p2}</td>`;
                    tbody.appendChild(row);
                });
            }

            renderPlayoffTable('semifinal', ['SF1','SF2']);
            renderPlayoffTable('third', ['3RD']);
            renderPlayoffTable('final', ['F']);
            
            // Создаем кнопки после рендеринга данных
            createToggleButtons();
        })
        .catch(err => {
            console.error('Ошибка загрузки данных:', err);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.textContent = 'Ошибка загрузки данных. Пожалуйста, обновите страницу.';
            document.body.prepend(errorDiv);
        });
});