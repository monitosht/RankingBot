const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Rolls a dice for you."),
  async execute(interaction) {
    const result = Math.floor(Math.random() * 6 + 1);
    await interaction.reply(
      `${interaction.user} rolled a ${result} :game_die:`
    );
  },
};
