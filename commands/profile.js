const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Displays the users Ranking profile."),
  async execute(interaction, profileData) {
    const username = interaction.user.username;
    const { wins, losses, draws, elo } = profileData;

    await interaction.reply(
      `# ${username}\n**Wins:** ${wins} **Losses:** ${losses} **Draws:** ${draws}\n**Elo:** ${elo}`
    );
  },
};
