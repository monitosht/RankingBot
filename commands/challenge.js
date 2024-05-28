const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");

const profileModel = require("../models/profileSchema");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("Lets you challenge another player to a match.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The player you want to challenge.")
        .setRequired(true)
    ),
  async execute(interaction, profileData) {
    await interaction.deferReply();

    const user = interaction.user;
    const { wins, losses, draws, elo } = profileData;

    const otherUser = interaction.options.getMember("user");

    let otherProfile = await profileModel.findOne({
      userId: otherUser.id,
    });

    if (!otherProfile) {
      await interaction.editReply(
        `The user you are attempting to challenge has not yet registered into the Ranking database. Users can register by using the \`/profile\` command.`
      );
      return;
    }

    const { wins: ow, losses: ol, draws: od, elo: oe } = otherProfile;

    const embed = {
      color: 0xfc1946,
      title: "New Challenge",
      fields: [
        {
          name: "Blue Side",
          value: `${user}
          Elo: ${elo}
          (W: ${wins} L: ${losses} D: ${draws})`,
          inline: true,
        },
        {
          name: `VS`,
          value: "",
          inline: true,
        },
        {
          name: "Red Side",
          value: `${otherUser}
          Elo: ${oe}
          (W: ${ow} L: ${ol} D: ${od})`,
          inline: true,
        },
      ],
    };

    const blueButton = new ButtonBuilder()
      .setCustomId("blue")
      .setLabel("Blue Side Wins")
      .setStyle(ButtonStyle.Primary);

    const drawButton = new ButtonBuilder()
      .setCustomId("draw")
      .setLabel("Draw")
      .setStyle(ButtonStyle.Secondary);

    const redButton = new ButtonBuilder()
      .setCustomId("red")
      .setLabel("Red Side Wins")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      blueButton,
      drawButton,
      redButton
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    const collectorFilter = (i) =>
      i.user.id === interaction.user.id || i.user.id === otherUser.id;

    try {
      const result = await response.awaitMessageComponent({
        filter: collectorFilter,
      });

      if (result.customId === "blue") {
        await profileModel.findOneAndUpdate(
          { userId: user.id },
          {
            $inc: {
              wins: 1,
              elo: eloCalculator(elo, oe, "win"),
            },
          }
        );
        await profileModel.findOneAndUpdate(
          { userId: otherUser.id },
          {
            $inc: {
              losses: 1,
              elo: eloCalculator(elo, oe, "loss"),
            },
          }
        );
        await result.update({
          components: [],
        });
        await interaction.followUp(
          `${user} wins the match and gains + ${eloCalculator(
            elo,
            oe,
            "win"
          )} Elo!\n${otherUser} losses ${eloCalculator(elo, oe, "loss")} Elo.`
        );
      } else if (result.customId === "draw") {
        await profileModel.findOneAndUpdate(
          { userId: user.id },
          {
            $inc: {
              draws: 1,
            },
          }
        );
        await profileModel.findOneAndUpdate(
          { userId: otherUser.id },
          {
            $inc: {
              draws: 1,
            },
          }
        );
        await result.update({
          components: [],
        });
        await interaction.followUp(
          `The match between ${user} and ${otherUser} has resulted in a draw.`
        );
      } else if (result.customId === "red") {
        await profileModel.findOneAndUpdate(
          { userId: user.id },
          {
            $inc: {
              losses: 1,
              elo: eloCalculator(elo, oe, "loss"),
            },
          }
        );
        await profileModel.findOneAndUpdate(
          { userId: otherUser.id },
          {
            $inc: {
              wins: 1,
              elo: eloCalculator(elo, oe, "win"),
            },
          }
        );
        await result.update({
          components: [],
        });
        await interaction.followUp(
          `${otherUser} wins the match and gains + ${eloCalculator(
            elo,
            oe,
            "win"
          )} Elo!\n${user} losses ${eloCalculator(elo, oe, "loss")} Elo.`
        );
      }
    } catch (error) {
      console.log(error);
    }
  },
};

const eloCalculator = (a, b, c) => {
  let result = a > b ? a - b : b - a;
  let score = 0.5;

  if (c === "win") {
    score = 1;
  } else if (c === "loss") {
    score = 0;
  }

  result = result / 400;
  result = Math.pow(10, result) + 1;
  result = 1 / result;
  result = 20 * (score - result);

  return Math.round(result);
};
