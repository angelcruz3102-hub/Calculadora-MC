document.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.getElementById('main-nav');
    const appContent = document.getElementById('app-content');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    // Configuración Modular
    const modules = [
        { id: 'm1', title: 'Granulometría', render: renderM1 },
        { id: 'm2', title: 'Propiedades Físicas', render: renderM2 },
        { id: 'm3', title: 'Diseño Mezclas (ACI)', render: renderM3 },
        { id: 'm4', title: 'Cuantificación', render: renderM4 },
        { id: 'm5', title: 'Resistencia Mecánica', render: renderM5 }
    ];

    // Generar Menú Dinámico
    modules.forEach((mod, index) => {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = mod.title;
        btn.onclick = () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (window.innerWidth <= 820) sidebar.classList.remove('open');
            appContent.innerHTML = '';
            mod.render(appContent);
        };
        mainNav.appendChild(btn);
        if (index === 0) btn.click();
    });

    // Helpers
    function createElement(tag, className, html = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.innerHTML = html;
        return el;
    }

    function createInputGroup(id, label, step = 'any', value = '') {
        return `
            <div class="form-group">
                <label for="${id}">${label}</label>
                <input type="number" id="${id}" step="${step}" value="${value}">
            </div>
        `;
    }

    // --- MÓDULO 1: Análisis Granulométrico ---
    function renderM1(container) {
        const tamices = ['3"', '2"', '1 1/2"', '1"', '3/4"', '1/2"', '3/8"', 'No. 4', 'No. 8', 'No. 16', 'No. 30', 'No. 50', 'No. 100', 'Fondo'];
        const card = createElement('div', 'card', `
            <h2>Análisis Granulométrico</h2>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr><th>Tamiz</th><th>Retenido (g)</th><th>% Ret.</th><th>% Ret. Acum.</th><th>% Pasa</th></tr>
                    </thead>
                    <tbody>
                        ${tamices.map((t, i) => `
                            <tr>
                                <td>${t}</td>
                                <td><input type="number" class="peso-ret" data-index="${i}" step="any" placeholder="0"></td>
                                <td class="p-ret">0.00</td><td class="p-acu">0.00</td><td class="p-pasa">100.00</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
            <div class="result-box"><div>Módulo de Finura</div><span id="m1-mf">0.00</span></div>
            <button class="btn" id="m1-calc">Procesar Tamices</button>
        `);
        container.appendChild(card);

        // Cargar state previo
        const saved = JSON.parse(localStorage.getItem('lab_m1') || '[]');
        if (saved.length) card.querySelectorAll('.peso-ret').forEach((inp, i) => inp.value = saved[i] || '');

        card.querySelector('#m1-calc').addEventListener('click', () => {
            const inputs = card.querySelectorAll('.peso-ret');
            let pesos = Array.from(inputs).map(inp => parseFloat(inp.value) || 0);
            localStorage.setItem('lab_m1', JSON.stringify(pesos));
            
            let pesoTotal = pesos.reduce((a, b) => a + b, 0);
            if (pesoTotal === 0) return alert('Ingrese pesos retenidos válidos.');

            let pAcu = 0, sumaMF = 0;
            // CORRECCIÓN: Se agrega el índice 9 (Tamiz No. 16) a la sumatoria estándar
            const indicesMF = [12, 11, 10, 9, 8, 7, 6, 4, 2, 0]; // 100, 50, 30, 16, 8, 4, 3/8", 3/4", 1.5", 3"

            pesos.forEach((p, i) => {
                let pRet = (p / pesoTotal) * 100;
                pAcu = Math.min(100, pAcu + pRet);
                
                card.querySelectorAll('.p-ret')[i].textContent = pRet.toFixed(2);
                card.querySelectorAll('.p-acu')[i].textContent = pAcu.toFixed(2);
                card.querySelectorAll('.p-pasa')[i].textContent = Math.max(0, 100 - pAcu).toFixed(2);
                
                if (indicesMF.includes(i)) sumaMF += pAcu;
            });
            card.querySelector('#m1-mf').textContent = (sumaMF / 100).toFixed(2);
        });
    }

    // --- MÓDULO 2: Propiedades Físicas ---
    function renderM2(container) {
        const card = createElement('div', 'card', `
            <h2>Propiedades Físicas de los Agregados</h2>
            <div class="grid-2">
                ${createInputGroup('m2-ph', 'Peso Muestra Húmeda (g)')}
                ${createInputGroup('m2-psss', 'Peso SSS (g)')}
                ${createInputGroup('m2-ps', 'Peso Muestra Seca (g)')}
                ${createInputGroup('m2-vr', 'Volumen del Recipiente (cm³)')}
                ${createInputGroup('m2-pr', 'Peso del Recipiente Vacío (g)')}
                ${createInputGroup('m2-va', 'Volumen de Agua Desplazada (cm³)')}
            </div>
            <button class="btn" id="m2-calc">Calcular Propiedades</button>
            <div id="m2-res" style="display:none;">
                <div class="result-box">Contenido de Humedad (%) <span id="r-hum"></span></div>
                <div class="result-box">Absorción (%) <span id="r-abs"></span></div>
                <div class="result-box">Gravedad Específica <span id="r-ge"></span></div>
                <div class="result-box">Peso Unitario (kg/m³) <span id="r-pu"></span></div>
                <div class="result-box">Porcentaje de Vacíos (%) <span id="r-vac"></span></div>
            </div>
        `);
        container.appendChild(card);

        card.querySelector('#m2-calc').addEventListener('click', () => {
            const v = (id) => parseFloat(document.getElementById(id).value) || 0;
            const ph = v('m2-ph'), psss = v('m2-psss'), ps = v('m2-ps');
            const vr = v('m2-vr'), pr = v('m2-pr'), va = v('m2-va');

            if (!ps) return alert('El peso seco es obligatorio');

            const humedad = ((ph - ps) / ps) * 100;
            const absorcion = ((psss - ps) / ps) * 100;
            const ge = va ? (ps / va) : 0;
            const pu = vr ? ((ph - pr) / vr) * 1000 : 0; // gr/cm3 a kg/m3
            const vacios = (ge && pu) ? (1 - (pu / (ge * 1000))) * 100 : 0;

            document.getElementById('r-hum').textContent = humedad.toFixed(2);
            document.getElementById('r-abs').textContent = absorcion.toFixed(2);
            document.getElementById('r-ge').textContent = ge.toFixed(2);
            document.getElementById('r-pu').textContent = pu.toFixed(2);
            document.getElementById('r-vac').textContent = vacios.toFixed(2);
            document.getElementById('m2-res').style.display = 'block';

            localStorage.setItem('lab_fisicas', JSON.stringify({ ge, absorcion }));
        });
    }

    // --- MÓDULO 3: Diseño de Mezclas ACI ---
    function renderM3(container) {
        const fisicas = JSON.parse(localStorage.getItem('lab_fisicas') || '{}');
        const defaultGE = fisicas.ge ? fisicas.ge.toFixed(2) : '2.65';

        const card = createElement('div', 'card', `
            <h2>Dosificación de Mezclas (Método ACI - 1m³)</h2>
            <div class="grid-2">
                ${createInputGroup('m3-fc', "Resistencia f'c (kg/cm²)", 'any', '210')}
                <div class="form-group">
                    <label>T.M.N Agregado</label>
                    <select id="m3-tma">
                        <option value="9.5">3/8"</option><option value="12.5">1/2"</option>
                        <option value="19" selected>3/4"</option><option value="25">1"</option>
                    </select>
                </div>
                ${createInputGroup('m3-mf', 'Módulo Finura Arena', 'any', '2.80')}
                ${createInputGroup('m3-ge-cem', 'G.E. Cemento', 'any', '3.15')}
                ${createInputGroup('m3-ge-gr', 'G.E. Grava', 'any', defaultGE)}
                ${createInputGroup('m3-ge-ar', 'G.E. Arena', 'any', defaultGE)}
            </div>
            <button class="btn" id="m3-calc">Generar Diseño</button>
            <div id="m3-res" style="display:none;">
                <div class="result-box">Agua de Diseño <span id="r-agua"></span></div>
                <div class="result-box">Cemento <span id="r-cem"></span></div>
                <div class="result-box">Grava Seca <span id="r-grava"></span></div>
                <div class="result-box">Arena Seca <span id="r-arena"></span></div>
            </div>
        `);
        container.appendChild(card);

        card.querySelector('#m3-calc').addEventListener('click', () => {
            const fc = parseFloat(document.getElementById('m3-fc').value);
            const ge_c = parseFloat(document.getElementById('m3-ge-cem').value);
            const ge_g = parseFloat(document.getElementById('m3-ge-gr').value);
            const ge_a = parseFloat(document.getElementById('m3-ge-ar').value);
            
            // Cálculos aproximados método ACI absoluto
            const ac = Math.max(0.40, 0.82 - (fc * 0.0014));
            const agua = document.getElementById('m3-tma').value === "19" ? 205 : 190; 
            const cem = agua / ac;
            
            const volAgua = agua / 1000;
            const volCem = cem / (ge_c * 1000);
            const volAire = 0.02; // 2% atrapado
            
            const pesoGrava = 0.62 * 1600; // factor b/bo promedio * peso unit. comp.
            const volGrava = pesoGrava / (ge_g * 1000);
            
            const volArena = 1 - (volAgua + volCem + volGrava + volAire);
            const pesoArena = volArena * (ge_a * 1000);

            document.getElementById('r-agua').textContent = agua.toFixed(1) + ' kg';
            document.getElementById('r-cem').textContent = cem.toFixed(1) + ' kg';
            document.getElementById('r-grava').textContent = pesoGrava.toFixed(1) + ' kg';
            document.getElementById('r-arena').textContent = Math.max(0, pesoArena).toFixed(1) + ' kg';
            document.getElementById('m3-res').style.display = 'block';
        });
    }

    // --- MÓDULO 4: Cuantificación ---
    function renderM4(container) {
        const card = createElement('div', 'card', `
            <h2>Cuantificación de Elementos</h2>
            
            <h3 style="margin-top:1rem;">Mampostería (Bloques)</h3>
            <div class="grid-2">${createInputGroup('m4-area', 'Área de Muro (m²)')}</div>
            <button class="btn btn-secondary" id="b-muro">Calcular Muro</button>
            <div id="res-muro" style="display:none;" class="result-box">Bloques (uds) <span id="r-blk"></span></div>

            <h3 style="margin-top:2rem;">Acero de Refuerzo</h3>
            <div class="grid-2">
                ${createInputGroup('m4-ml', 'Longitud Total (ml)')}
                <div class="form-group">
                    <label>Diámetro Varilla</label>
                    <select id="m4-diam">
                        <option value="9.53">3/8" (#3)</option>
                        <option value="12.7">1/2" (#4)</option>
                        <option value="15.88">5/8" (#5)</option>
                    </select>
                </div>
            </div>
            <button class="btn btn-secondary" id="b-acero">Calcular Acero</button>
            <div id="res-acero" style="display:none;" class="result-box">Peso (kg) / Varillas <span id="r-ace"></span></div>

            <h3 style="margin-top:2rem;">Hormigón</h3>
            <div class="grid-2">${createInputGroup('m4-vol', 'Volumen de Vaciado (m³)')}</div>
            <button class="btn btn-secondary" id="b-horm">Calcular Fundas</button>
            <div id="res-horm" style="display:none;" class="result-box">Fundas (42.5kg) <span id="r-fun"></span></div>
        `);
        container.appendChild(card);

        card.querySelector('#b-muro').onclick = () => {
            const m2 = parseFloat(document.getElementById('m4-area').value) || 0;
            document.getElementById('r-blk').textContent = Math.ceil(m2 * 12.5 * 1.05); // 5% desp
            document.getElementById('res-muro').style.display = 'flex';
        };

        card.querySelector('#b-acero').onclick = () => {
            const ml = parseFloat(document.getElementById('m4-ml').value) || 0;
            const d = parseFloat(document.getElementById('m4-diam').value);
            const pesoKg = ml * ((d * d) / 162);
            const varillas = Math.ceil(ml / 6); // 6m estándar
            document.getElementById('r-ace').textContent = `${pesoKg.toFixed(1)} kg / ${varillas} uds`;
            document.getElementById('res-acero').style.display = 'flex';
        };

        card.querySelector('#b-horm').onclick = () => {
            const vol = parseFloat(document.getElementById('m4-vol').value) || 0;
            document.getElementById('r-fun').textContent = Math.ceil(vol * 8.24); // ~350kg/m3
            document.getElementById('res-horm').style.display = 'flex';
        };
    }

    // --- MÓDULO 5: Resistencia Mecánica ---
    function renderM5(container) {
        const card = createElement('div', 'card', `
            <h2>Prueba de Resistencia Mecánica</h2>
            <div class="grid-2">
                ${createInputGroup('m5-p', 'Carga de Rotura (kg)')}
                <div class="form-group">
                    <label>Forma Probeta</label>
                    <select id="m5-tipo"><option value="cil">Cilíndrica</option><option value="cub">Cúbica</option></select>
                </div>
                ${createInputGroup('m5-dim', 'Dimensión/Diámetro (cm)', 'any', '15')}
            </div>
            <button class="btn" id="m5-calc">Calcular Esfuerzo</button>
            <div id="m5-res" style="display:none;">
                <div class="result-box">Resistencia (kg/cm²) <span id="r-fck"></span></div>
                <div class="result-box">Resistencia (MPa) <span id="r-mpa"></span></div>
            </div>
        `);
        container.appendChild(card);

        card.querySelector('#m5-calc').onclick = () => {
            const p = parseFloat(document.getElementById('m5-p').value);
            const dim = parseFloat(document.getElementById('m5-dim').value);
            if (!p || !dim) return;

            const area = document.getElementById('m5-tipo').value === 'cil' ? 
                Math.PI * Math.pow(dim / 2, 2) : (dim * dim);
            
            const fc = p / area;
            document.getElementById('r-fck').textContent = fc.toFixed(2);
            document.getElementById('r-mpa').textContent = (fc * 0.0980665).toFixed(2);
            document.getElementById('m5-res').style.display = 'block';
        };
    }
});
