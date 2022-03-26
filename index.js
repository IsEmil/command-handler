const discord = require("discord.js");
const path = require("path");
const fs = require("fs");

const { log } = require("./utils/console.js");
const config = require("./config.js");

const client = new discord.Client({
    intents: [
        "GUILDS",
        "GUILD_MESSAGES",
        "GUILD_MEMBERS",
    ]
});

client.commands = new discord.Collection();
client.cooldowns = new discord.Collection();

/**
 * @description The Discord bot logger
 * @type {Logger}
 * @param {*} embed The discord embed object
 * @return {void}
 */
function botLogger(Embed) {
    let guild = client.guilds.cache.get(config.guild);
    let channel = guild.channels.cache.get(config.logsChannel);
    channel.send({ embeds: [Embed] });
};

/**
 * @description The Discord command loader
 */
function loadCommands() {
    let commandFolder = fs.readdirSync(path.join(__dirname, "commands")).filter((file) => file.endsWith(".js"));
    commandFolder.forEach((file) => {
        try {
            let cmd = require(path.join(__dirname, "commands", file));
            client.commands.set(cmd.name, cmd);
            log("green", `Loaded command: ${cmd.name}.js`);
        } catch (err) {
            console.log(err.toString());
            botLogger(new discord.MessageEmbed()
                .setTitle("Command Error")
                .setDescription(`Unable to load ${file}`)
                .setColor("RED")
            );
        };
    });
};

/**
 * @description The Discord events loader
 */
function loadEvents() {
    const commandFolder = fs.readdirSync(path.join(__dirname, "events")).filter((file) => file.endsWith(".js"));
    commandFolder.forEach((file) => {
        try {
            let module = require(path.join(__dirname, "events", file));
            log("green", `Loaded event: ${file}.js`);
        } catch (err) {
            console.log(err.toString());
            botLogger(new discord.MessageEmbed()
                .setTitle("Events Error")
                .setDescription(`Unable to load ${file}`)
                .setColor("RED")
            );
        };
    })
}

client.on("ready", () => {
    console.log("Discord Bot online");
    client.user.setActivity("for !help", {
        type: "WATCHING"
    });
    loadCommands();
    loadEvents();
});

client.on("messageCreate", async (message) => {
    if (message.author.bot) return; // no bot time

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    try {

        const cmd = client.commands.get(command)
            || client.commands.find((c) => c.aliases && c.aliases.includes(command));
        if (!cmd) {
            throw new Error("Command not found!");
        }

        if (cmd.guildOnly && message.guild.id !== config.guild && message.channel.type !== "text") throw new Error("Please run any commands in your own server!");

         if (cmd.permission !== null) { cmd.permission.forEach((id) => { if (!message.member.permissions.has(id)) throw new Error("You do not have permission to use this command!") }); };

        let hasPerms = false;
        if (cmd.roles !== null) {
            cmd.roles.forEach((id) => {
                if (message.member.roles.cache.has(id)) {
                    hasPerms = true;
                }
            });
        } else {
            hasPerms = true;
        }

        if (hasPerms) {
            if (!client.cooldowns.has(cmd.name)) { client.cooldowns.set(cmd.name, new discord.Collection()); }

            // Thanks to https://github.com/discordjs/guide/tree/v12/code-samples/command-handling/adding-features/12
            const now = Date.now();
            const timestamps = client.cooldowns.get(cmd.name);
            const cooldownAmount = (cmd.cooldown || 3) * 1000;

            if (timestamps.has(message.author.id)) {
                const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    return message.reply({ embeds: [new discord.MessageEmbed().setTitle("Error").setDescription(`You have a cooldown on ${timeLeft.toFixed(1)}s.`).setColor("RED")] });
                }
            }

            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

            await cmd.execute(message, message.member, args, client);
        } else {
            throw new Error("You do not have permission to use this command!");
        }

    } catch (err) {

        botLogger(new discord.MessageEmbed()
            .setTitle("Command Error")
            .setDescription(`${err.message}`)
            .setColor("RED")
        );
        
        message.reply({ embeds: [new discord.MessageEmbed().setTitle("Error").setDescription(err.message).setColor("RED")] })

    }
});

client.login(config.token);
