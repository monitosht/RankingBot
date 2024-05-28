const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("Displays the users Ranking profile."),
  async execute(interaction, profileData) {
    const user = interaction.user;
    const { wins, losses, draws, elo } = profileData;

    await interaction.reply(
      `# ${user}\n**W:** ${wins} **L:** ${losses} **D:** ${draws}\n**Elo:** ${elo}`
    );
  },
};
