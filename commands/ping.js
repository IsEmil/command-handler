const { MessageActionRow, MessageEmbed, MessageButton, MessageSelectMenu } = require("discord.js");

module.exports = {
    name: "ping", // the command name
    aliases: [], // multiple command names
    guildOnly: false, // command is only usable in your guild
    permission: [], // type of permission needed that can use this command
    roles: [], // type of roles that can use this command (ONLY ROLE ID)
    cooldown: 10, // how long the user has to wait before the command can be used again
    execute: async (message, user, args, client) => {
        message.reply({ content: `${client.ws.ping}ms` })
    },
};
