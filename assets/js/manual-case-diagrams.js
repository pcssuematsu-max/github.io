(function () {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";
    var palette = {
        neutral: "#9c9c9c",
        magenta: "#ed00ef",
        lime: "#76f400",
        blue: "#1487ed",
        amber: "#ffbd10"
    };

    var centerCases = {
        "center-make-1": [[9], [10]],
        "center-make-2": [[5], [6]],
        "center-insert": [[5, 9], [5, 9]],
        "center-three-same": [[9], [5, 9, 10]],
        "center-single": [[5], [5, 6, 9]],
        "center-opposite": [[5], [], [6]]
    };

    var edgeCases = {
        "edge-first-ru": {
            "left:1": ["magenta", "lime"],
            "top:1": ["magenta", "lime"]
        },
        "edge-first-fr": {
            "left:1": ["magenta", "lime"],
            "top:2": ["lime", "magenta"]
        },
        "edge-first-rd": {
            "left:1": ["magenta", "lime"],
            "bottom:2": ["magenta", "lime"]
        },
        "edge-first-fprime": {
            "left:1": ["magenta", "lime"],
            "bottom:2": ["lime", "magenta"]
        },
        "edge-first-flip": {
            "left:1": ["magenta", "lime"],
            "right:1": ["magenta", "lime"]
        },
        "edge-pair-a": {
            "left:1": ["magenta", "lime"],
            "top:1": ["amber", "blue"],
            "right:1": ["blue", "amber"],
            "right:2": ["lime", "magenta"]
        },
        "edge-pair-b": {
            "left:1": ["magenta", "lime"],
            "top:2": ["blue", "amber"],
            "right:1": ["blue", "amber"],
            "right:2": ["lime", "magenta"]
        },
        "edge-pair-c": {
            "left:1": ["magenta", "lime"],
            "right:1": ["magenta", "lime"],
            "left:2": ["blue", "amber"],
            "right:2": ["blue", "amber"]
        }
    };

    function svgElement(name, attributes) {
        var element = document.createElementNS(NS, name);
        Object.keys(attributes || {}).forEach(function (key) {
            element.setAttribute(key, attributes[key]);
        });
        return element;
    }

    function addTitle(svg, text) {
        var title = svgElement("title");
        title.textContent = text;
        svg.appendChild(title);
    }

    function sticker(svg, x, y, width, height, colorName, radius) {
        svg.appendChild(svgElement("rect", {
            x: String(x),
            y: String(y),
            width: String(width),
            height: String(height),
            rx: String(radius),
            fill: palette[colorName] || palette.neutral,
            stroke: "#000",
            "stroke-width": "3.4",
            "stroke-linejoin": "round"
        }));
    }

    function drawCenterFace(svg, highlighted, offsetY) {
        var cell = 24;
        var colors = Array.from({ length: 16 }, function () { return "neutral"; });
        highlighted.forEach(function (index) { colors[index] = "magenta"; });

        colors.forEach(function (color, index) {
            var row = Math.floor(index / 4);
            var column = index % 4;
            sticker(svg, 10 + column * cell, offsetY + row * cell, 22, 22, color, 5.2);
        });
    }

    function renderCenterCase(svg, states) {
        states.forEach(function (state, index) {
            drawCenterFace(svg, state, 8 + index * 108);
        });
    }

    function setInnerColor(mainColors, side, index, color) {
        if (side === "top") {
            mainColors[index] = color;
        } else if (side === "right") {
            mainColors[index * 4 + 3] = color;
        } else if (side === "bottom") {
            mainColors[12 + index] = color;
        } else if (side === "left") {
            mainColors[index * 4] = color;
        }
    }

    function renderEdgeCase(svg, caseData) {
        var mainColors = Array.from({ length: 16 }, function () { return "neutral"; });
        var outerColors = {
            top: Array.from({ length: 4 }, function () { return "neutral"; }),
            right: Array.from({ length: 4 }, function () { return "neutral"; }),
            bottom: Array.from({ length: 4 }, function () { return "neutral"; }),
            left: Array.from({ length: 4 }, function () { return "neutral"; })
        };

        Object.keys(caseData).forEach(function (position) {
            var parts = position.split(":");
            var side = parts[0];
            var index = Number(parts[1]);
            var pair = caseData[position];
            outerColors[side][index] = pair[0];
            setInnerColor(mainColors, side, index, pair[1]);
        });

        mainColors.forEach(function (color, index) {
            var row = Math.floor(index / 4);
            var column = index % 4;
            sticker(svg, 29 + column * 23, 29 + row * 23, 21, 21, color, 4.8);
        });

        outerColors.top.forEach(function (color, index) {
            sticker(svg, 29 + index * 23, 7, 21, 16, color, 5.6);
        });
        outerColors.bottom.forEach(function (color, index) {
            sticker(svg, 29 + index * 23, 127, 21, 16, color, 5.6);
        });
        outerColors.left.forEach(function (color, index) {
            sticker(svg, 7, 29 + index * 23, 16, 21, color, 5.6);
        });
        outerColors.right.forEach(function (color, index) {
            sticker(svg, 127, 29 + index * 23, 16, 21, color, 5.6);
        });
    }

    function render(container) {
        var caseName = container.dataset.manualCase;
        var states = centerCases[caseName];
        var edgeData = edgeCases[caseName];
        var isCenter = Boolean(states);
        var height = isCenter ? 8 + states.length * 108 - 12 : 150;
        var svg = svgElement("svg", {
            viewBox: isCenter ? "0 0 116 " + height : "0 0 150 150",
            role: "img",
            "aria-label": container.dataset.label || "4x4キューブの手順図",
            preserveAspectRatio: "xMidYMid meet"
        });

        addTitle(svg, container.dataset.label || "4x4キューブの手順図");
        if (isCenter) {
            renderCenterCase(svg, states);
        } else if (edgeData) {
            renderEdgeCase(svg, edgeData);
        }
        container.appendChild(svg);
    }

    document.querySelectorAll("[data-manual-case]").forEach(render);
}());
