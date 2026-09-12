(function () {
    "use strict";

    document.querySelectorAll("[data-cube-viewer]").forEach(function (host) {
        var player = document.createElement("twisty-player");
        player.setAttribute("puzzle", "3x3x3");
        player.setAttribute("alg", "");
        player.setAttribute("experimental-setup-alg", host.dataset.setup || "");
        player.setAttribute("background", "none");
        player.setAttribute("hint-facelets", "none");
        player.setAttribute("control-panel", "none");
        player.setAttribute("experimental-drag-input", "auto");
        player.setAttribute("aria-label", host.getAttribute("aria-label") || "3×3キューブの立体ビューア");
        host.appendChild(player);
    });
}());
