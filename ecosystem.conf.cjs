module.exports = {
    apps: [
        {
            name: "jokr-api",
            // On veut que PM2 lise la version depuis le package.json RACINE
            cwd: "/var/installations/jokr",
            script: "apps/api/dist/index.js",
            interpreter: "node",
            env: {
                NODE_ENV: "production",
                PORT: 3001,
                FRONT_ORIGIN: "https://jokr.ebasson.fr"
            }
        }
    ]
};
