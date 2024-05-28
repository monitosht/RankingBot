const { SlashCommandBuilder } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription(
      "Displays the highested rated players on the Ranking leaderboard."
    ),
  async execute(interaction, profileData) {
    await interaction.deferReply();

    const { id } = interaction.user;
    const { elo } = profileData;

    const members = await profileModel
      .find()
      .sort({ elo: -1 })
      .catch((error) => console.log(error));

    const memberIdx = members.findIndex((member) => member.userId === id);

    const topTen = members.slice(0, 10);

    let desc = "";

    for (let i = 0; i < topTen.length; i++) {
      let { user } = await interaction.guild.members.fetch(topTen[i].userId);
      let { wins, losses, draws, elo } = topTen[i];
      desc += `**${
        i + 1
      }. ${user}:** ${elo} Elo (**W:** ${wins} **L:** ${losses} **D:** ${draws})\n\n`;
    }

    const embed = {
      color: 0xfc1946,
      title: "Ranking Leaderboard",
      description: desc,
      footer: {
        text: `You are currently rank #${memberIdx + 1} with ${elo} Elo.`,
      },
    };

    await interaction.editReply({ embeds: [embed] });
  },
};
