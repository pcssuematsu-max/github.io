(function () {
    "use strict";

    var statsUrl = "assets/data/cube-manual-stats.json";

    function setText(name, value) {
        document.querySelectorAll('[data-manual-stat="' + name + '"]').forEach(function (element) {
            element.textContent = value;
        });
    }

    fetch(statsUrl)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Manual statistics could not be loaded.");
            }
            return response.json();
        })
        .then(function (stats) {
            setText("guides", "主要" + stats.guides + "ページ");
            setText("cases", stats.cases.total + "分類");
            setText(
                "case-detail",
                "F2L " + stats.cases.f2l + "分類、OLL " + stats.cases.oll + "ケース、PLL " + stats.cases.pll + "ケースを掲載しています。"
            );
            setText("diagrams", stats.diagrams + "点");
        })
        .catch(function () {
            // JavaScriptが使えない環境でも、HTMLに書いた直近の集計値を表示する。
        });
}());
