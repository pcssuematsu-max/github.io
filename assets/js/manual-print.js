(function () {
    "use strict";

    function splitIndexCards(scope) {
        var roots = [];
        if (scope.matches && scope.matches(".manual-oll, .manual-pll")) {
            roots.push(scope);
        } else {
            roots = Array.from(scope.querySelectorAll(".manual-oll, .manual-pll"));
        }

        roots.forEach(function (root) {
            var cards = root.querySelector(".cards");
            if (!cards || cards.dataset.paginated === "true") return;

            var items = Array.from(cards.children);
            var pageSize = 15;
            cards.dataset.paginated = "true";
            cards.classList.add("cards-page");

            for (var offset = pageSize; offset < items.length; offset += pageSize) {
                var continuation = cards.cloneNode(false);
                continuation.removeAttribute("id");
                continuation.classList.add("cards-continuation");
                continuation.dataset.paginated = "true";
                items.slice(offset, offset + pageSize).forEach(function (item) {
                    continuation.appendChild(item);
                });
                cards.parentNode.insertBefore(continuation, cards.nextSibling);
                cards = continuation;
            }
        });
    }

    function prepareManual(scope) {
        scope = scope || document;

        scope.querySelectorAll("details").forEach(function (details) {
            details.open = true;
        });

        splitIndexCards(scope);

        scope.querySelectorAll(".main-contents").forEach(function (main) {
            if (main.querySelector(".manual-end-mark")) return;
            var endMark = document.createElement("div");
            endMark.className = "manual-end-mark";
            endMark.textContent = "END OF CHAPTER";
            main.appendChild(endMark);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            prepareManual(document);
        });
    } else {
        prepareManual(document);
    }

    window.prepareManual = prepareManual;
    window.addEventListener("beforeprint", function () {
        prepareManual(document);
    });
}());
