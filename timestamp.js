(function() {
    function setTimestamp(id) {
        var el = document.getElementById(id);

        if (el) {
            fetch("pergroup/" + id + ".json")
                .then(r => r.json())
                .then(date => el.textContent = date);
        }
    }

    setTimestamp("spec-update");
    setTimestamp("milestone-update");
    setTimestamp("github-update");
})();
