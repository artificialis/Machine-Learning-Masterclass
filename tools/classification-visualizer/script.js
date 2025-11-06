document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('plot');
    const ctx = canvas.getContext('2d');
    const d3Canvas = d3.select(canvas);

    const width = canvas.width;
    const height = canvas.height;

    let data = [];
    let model = null;
    let trained = false;

    const xScale = d3.scaleLinear().domain([-1, 1]).range([0, width]);
    const yScale = d3.scaleLinear().domain([-1, 1]).range([height, 0]);

    // --- Data Generation ---
    function generatePreset(name) {
        data = [];
        trained = false;
        switch (name) {
            case 'linear':
                for (let i = 0; i < 50; i++) {
                    const x = Math.random() * 2 - 1;
                    const y = Math.random() * 2 - 1;
                    const label = y > x ? 1 : 0;
                    data.push({ x, y, label });
                }
                break;
            case 'circles':
                for (let i = 0; i < 100; i++) {
                    const r = Math.random() * 0.8;
                    const angle = Math.random() * 2 * Math.PI;
                    const x = r * Math.cos(angle);
                    const y = r * Math.sin(angle);
                    const label = r > 0.4 ? 1 : 0;
                    data.push({ x, y, label });
                }
                break;
            case 'nonlinear':
                for (let i = 0; i < 100; i++) {
                    const x = Math.random() * 2 - 1;
                    const y = Math.random() * 2 - 1;
                    const label = y > Math.sin(x * Math.PI) ? 1 : 0;
                    data.push({ x, y, label });
                }
                break;
        }
        draw();
    }

    // --- Drawing ---
    function draw() {
        ctx.clearRect(0, 0, width, height);
        if (trained) {
            drawDecisionBoundary();
        }
        drawPoints();
    }

    function drawPoints() {
        data.forEach(p => {
            ctx.beginPath();
            ctx.arc(xScale(p.x), yScale(p.y), 5, 0, 2 * Math.PI);
            ctx.fillStyle = p.label === 1 ? 'blue' : 'red';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
        });
    }

    function drawDecisionBoundary() {
        if (!model) return;

        const resolution = 10;
        for (let i = 0; i < width; i += resolution) {
            for (let j = 0; j < height; j += resolution) {
                const x = xScale.invert(i);
                const y = yScale.invert(j);
                let pred;
                if (model.predictOne) { // libsvm-js
                    pred = model.predictOne([x, y]);
                } else { // ml.js
                    pred = model.predict([[x, y]])[0];
                }
                ctx.fillStyle = pred == 1 ? 'rgba(0, 0, 255, 0.1)' : 'rgba(255, 0, 0, 0.1)';
                ctx.fillRect(i, j, resolution, resolution);
            }
        }
    }

    // --- UI Event Listeners ---
    d3Canvas.on('click', (event) => {
        const [mx, my] = d3.pointer(event);
        const x = xScale.invert(mx);
        const y = yScale.invert(my);
        const label = event.shiftKey ? 0 : 1; // Hold shift for red points
        data.push({ x, y, label });
        trained = false;
        draw();
    });

    document.getElementById('load-preset').addEventListener('click', () => {
        const preset = document.getElementById('preset-select').value;
        if (preset !== 'none') {
            generatePreset(preset);
        }
    });

    document.getElementById('train-button').addEventListener('click', async () => {
        if (data.length === 0) {
            alert('Please add some data points first.');
            return;
        }

        const algorithm = document.getElementById('algorithm-select').value;
        const features = data.map(p => [p.x, p.y]);
        const labels = data.map(p => p.label);

        switch (algorithm) {
            case 'svm':
                const SVM = await loadSVM();
                model = new SVM({ C: 1 });
                model.train(features, labels);
                break;
            case 'decision-tree':
                model = new ML.DecisionTreeClassifier();
                model.train(features, labels);
                break;
            case 'knn':
                model = new ML.KNN(features, labels, {k: 3});
                break;
        }

        trained = true;
        draw();
    });

    document.getElementById('reset-button').addEventListener('click', () => {
        data = [];
        model = null;
        trained = false;
        draw();
    });

    // Initial draw
    draw();
});
