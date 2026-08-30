(function () {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var palette = {
        white: "#f8f7ef",
        yellow: "#f1d83a",
        red: "#e75b62",
        orange: "#ef9436",
        blue: "#3791c5",
        green: "#54a96a",
        neutral: "#b8c0c4",
        dark: "#263137",
        target: "#ef6695",
        reference: "#a6d94b"
    };

    function svgElement(name, attributes) {
        var element = document.createElementNS(NS, name);
        Object.keys(attributes || {}).forEach(function (key) {
            element.setAttribute(key, attributes[key]);
        });
        return element;
    }

    function faceFill(color) {
        return Array.from({ length: 16 }, function () { return color; });
    }

    function stateFor(name) {
        var state = {
            top: faceFill("yellow"),
            front: faceFill("red"),
            right: faceFill("blue")
        };

        if (name === "anatomy") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [0, 3, 12, 15].forEach(function (index) { state.front[index] = "reference"; });
            [1, 2, 4, 7, 8, 11, 13, 14].forEach(function (index) { state.front[index] = "target"; });
            [5, 6, 9, 10].forEach(function (index) { state.front[index] = "blue"; });
        }

        if (name === "centers-scrambled") {
            [5, 6, 9, 10].forEach(function (index, offset) {
                state.top[index] = ["red", "green", "white", "orange"][offset];
                state.front[index] = ["yellow", "blue", "orange", "white"][offset];
                state.right[index] = ["green", "red", "yellow", "orange"][offset];
            });
            [0, 1, 2, 3, 4, 7, 8, 11, 12, 13, 14, 15].forEach(function (index) {
                state.top[index] = "neutral";
                state.front[index] = "neutral";
                state.right[index] = "neutral";
            });
        }

        if (name === "center-bar") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 9].forEach(function (index) { state.front[index] = "target"; });
            [6, 10].forEach(function (index) { state.front[index] = "reference"; });
        }

        if (name === "center-insert-u" || name === "center-insert-u-prime") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 6, 9, 10].forEach(function (index) {
                state.front[index] = "red";
                state.right[index] = "blue";
            });
            if (name === "center-insert-u") {
                state.top[9] = "target";
                state.top[5] = "reference";
            } else {
                state.top[6] = "target";
                state.top[10] = "reference";
            }
        }

        if (name === "centers-solved") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 6, 9, 10].forEach(function (index) {
                state.top[index] = "yellow";
                state.front[index] = "red";
                state.right[index] = "blue";
            });
        }

        if (name === "wing-pair") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 6, 9, 10].forEach(function (index) {
                state.top[index] = "yellow";
                state.front[index] = "red";
                state.right[index] = "blue";
            });
            state.front[1] = "target";
            state.front[2] = "target";
            state.top[13] = "reference";
            state.top[14] = "reference";
        }

        if (name === "edge-escape-setup") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 6, 9, 10].forEach(function (index) {
                state.top[index] = "yellow";
                state.front[index] = "red";
                state.right[index] = "blue";
            });
            state.front[1] = "target";
            state.right[1] = "target";
            state.top[13] = "reference";
            state.top[14] = "reference";
        }

        if (name === "reduced") {
            state.top = faceFill("neutral");
            state.front = faceFill("neutral");
            state.right = faceFill("neutral");
            [5, 6, 9, 10].forEach(function (index) {
                state.top[index] = "yellow";
                state.front[index] = "red";
                state.right[index] = "blue";
            });
            [1, 2, 4, 7, 8, 11, 13, 14].forEach(function (index) {
                state.top[index] = "yellow";
                state.front[index] = "red";
                state.right[index] = "blue";
            });
        }

        if (name === "oll-parity") {
            state.top[1] = "neutral";
            state.top[2] = "neutral";
            state.top[13] = "target";
            state.top[14] = "target";
        }

        if (name === "pll-parity") {
            state.front[1] = "target";
            state.front[2] = "target";
            state.right[1] = "reference";
            state.right[2] = "reference";
        }

        return state;
    }

    function sticker(group, origin, u, v, row, column, colorName) {
        var points = [
            [origin[0] + column * u[0] + row * v[0], origin[1] + column * u[1] + row * v[1]],
            [origin[0] + (column + 1) * u[0] + row * v[0], origin[1] + (column + 1) * u[1] + row * v[1]],
            [origin[0] + (column + 1) * u[0] + (row + 1) * v[0], origin[1] + (column + 1) * u[1] + (row + 1) * v[1]],
            [origin[0] + column * u[0] + (row + 1) * v[0], origin[1] + column * u[1] + (row + 1) * v[1]]
        ];
        var center = points.reduce(function (sum, point) {
            return [sum[0] + point[0] / 4, sum[1] + point[1] / 4];
        }, [0, 0]);
        var inset = points.map(function (point) {
            return [
                center[0] + (point[0] - center[0]) * 0.91,
                center[1] + (point[1] - center[1]) * 0.91
            ];
        });
        group.appendChild(svgElement("polygon", {
            points: inset.map(function (point) { return point.join(","); }).join(" "),
            fill: palette[colorName] || palette.neutral,
            stroke: palette.dark,
            "stroke-width": "1.6",
            "stroke-linejoin": "round"
        }));
    }

    function drawFace(svg, colors, origin, u, v) {
        var group = svgElement("g");
        colors.forEach(function (color, index) {
            sticker(group, origin, u, v, Math.floor(index / 4), index % 4, color);
        });
        svg.appendChild(group);
    }

    function drawFaceLabel(svg, labelText, x, y) {
        var label = svgElement("text", {
            x: String(x),
            y: String(y),
            fill: palette.dark,
            "font-family": "Avenir Next, sans-serif",
            "font-size": "18",
            "font-weight": "800",
            "text-anchor": "middle"
        });
        label.textContent = labelText;
        svg.appendChild(label);
    }

    function drawFlatUTurnArrow(svg, reverse) {
        var markerId = reverse ? "arrow-u-prime" : "arrow-u";
        var defs = svgElement("defs");
        var marker = svgElement("marker", {
            id: markerId,
            markerWidth: "8",
            markerHeight: "8",
            refX: "6",
            refY: "3",
            orient: "auto",
            markerUnits: "strokeWidth"
        });
        marker.appendChild(svgElement("path", {
            d: "M0,0 L0,6 L7,3 z",
            fill: palette.dark
        }));
        defs.appendChild(marker);
        svg.appendChild(defs);

        var start = reverse ? [103, 30] : [39, 30];
        var end = reverse ? [39, 30] : [103, 30];
        svg.appendChild(svgElement("path", {
            d: "M " + start[0] + " " + start[1] + " Q 71 4 " + end[0] + " " + end[1],
            fill: "none",
            stroke: palette.dark,
            "stroke-width": "3.5",
            "stroke-linecap": "round",
            "marker-end": "url(#" + markerId + ")"
        }));
    }

    function drawFlatURView(svg, state, reverse) {
        drawFace(svg, state.top, [18, 42], [24, 0], [0, 24]);
        drawFace(svg, state.right, [154, 42], [24, 0], [0, 24]);
        drawFaceLabel(svg, "U", 18, 25);
        drawFaceLabel(svg, "R", 154, 25);
        drawFlatUTurnArrow(svg, reverse);
    }

    function render(container) {
        var stateName = container.dataset.state || "solved";
        var state = stateFor(stateName);
        var isCenterCase = stateName === "center-insert-u" || stateName === "center-insert-u-prime";
        var svg = svgElement("svg", {
            viewBox: isCenterCase ? "0 0 270 150" : "0 0 260 220",
            role: "img",
            "aria-label": container.dataset.label || "4x4キューブの図"
        });
        if (isCenterCase) {
            drawFlatURView(svg, state, stateName === "center-insert-u-prime");
        } else {
            drawFace(svg, state.top, [130, 10], [24, 12], [-24, 12]);
            drawFace(svg, state.front, [34, 58], [24, 12], [0, 24]);
            drawFace(svg, state.right, [130, 106], [24, -12], [0, 24]);
        }
        container.prepend(svg);
    }

    document.querySelectorAll("[data-cube-diagram]").forEach(render);
}());
