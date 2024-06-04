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

    const { wins: ow, losses: ol, draws: od, elo: oe, busy: b } = otherProfile;

    if (b) {
      await interaction.editReply(
        `${otherUser} is already in another challenge. Please try again when they are available.`
      );
      return;
    }

    const embed = {
      color: 0xfc1946,
      fields: [
        {
          name: "",
          value: `${user}
          Elo: ${elo}
          (W: ${wins} L: ${losses} D: ${draws})`,
          inline: true,
        },
        {
          name: `Has Challenged`,
          value: "",
          inline: true,
        },
        {
          name: "",
          value: `${otherUser}
          Elo: ${oe}
          (W: ${ow} L: ${ol} D: ${od})`,
          inline: true,
        },
      ],
    };

    const acceptButton = new ButtonBuilder()
      .setCustomId(`result-accept-${otherUser.id}`)
      .setLabel("Accept")
      .setStyle(ButtonStyle.Primary);

    const declineButton = new ButtonBuilder()
      .setCustomId(`result-decline-${otherUser.id}`)
      .setLabel("Decline")
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
      acceptButton,
      declineButton
    );

    const embed2 = {
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
      .setCustomId(`outcome-blue-${interaction.user.id}`)
      .setLabel("Blue Wins")
      .setStyle(ButtonStyle.Primary);

    const drawButton = new ButtonBuilder()
      .setCustomId(`outcome-draw-${interaction.user.id}`)
      .setLabel("Draw")
      .setStyle(ButtonStyle.Secondary);

    const cancelButton = new ButtonBuilder()
      .setCustomId(`outcome-cancel-${interaction.user.id}`)
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Secondary);

    const redButton = new ButtonBuilder()
      .setCustomId(`outcome-red-${interaction.user.id}`)
      .setLabel("Red Wins")
      .setStyle(ButtonStyle.Danger);

    const row2 = new ActionRowBuilder().addComponents(
      blueButton,
      drawButton,
      cancelButton,
      redButton
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row],
    });

    const collectorFilter = (i) => i.user.id === interaction.user.id;
    const collectorFilter2 = (i) => i.user.id === otherUser.id;

    try {
      const result = await response.awaitMessageComponent({
        filter: collectorFilter2,
        time: 300_000,
      });

      if (result.customId === `result-accept-${otherUser.id}`) {
        const start = await result.update({
          content: `${otherUser} has accepted ${interaction.user}'s challenge!`,
          embeds: [embed2],
          components: [row2],
        });
        await profileModel.findOneAndUpdate(
          { userId: user.id },
          { busy: true }
        );
        await profileModel.findOneAndUpdate(
          { userId: otherUser.id },
          { busy: true }
        );

        try {
          const outcome = await start.awaitMessageComponent({
            filter: collectorFilter,
            time: 3600_000,
          });
          if (outcome.customId === `outcome-blue-${interaction.user.id}`) {
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
            await outcome.update({
              components: [],
            });
            await interaction.followUp(
              `${user} wins the match and gains + ${eloCalculator(
                elo,
                oe,
                "win"
              )} Elo!\n${otherUser} losses ${eloCalculator(
                elo,
                oe,
                "loss"
              )} Elo.`
            );
          } else if (
            outcome.customId === `outcome-draw-${interaction.user.id}`
          ) {
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
            await outcome.update({
              components: [],
            });
            await interaction.followUp(
              `The match between ${user} and ${otherUser} has resulted in a draw.`
            );
          } else if (
            outcome.customId === `outcome-red-${interaction.user.id}`
          ) {
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
            await outcome.update({
              components: [],
            });
            await interaction.followUp(
              `${otherUser} wins the match and gains + ${eloCalculator(
                elo,
                oe,
                "win"
              )} Elo!\n${user} losses ${eloCalculator(elo, oe, "loss")} Elo.`
            );
          } else if (
            (outcome.customId = `outcome-cancel-${interaction.user.id}`)
          ) {
            await outcome.update({
              components: [],
            });
            await interaction.followUp(
              `The match between ${user} and ${otherUser} has been cancelled.`
            );
          }
          await profileModel.findOneAndUpdate(
            { userId: user.id },
            { busy: false }
          );
          await profileModel.findOneAndUpdate(
            { userId: otherUser.id },
            { busy: false }
          );
        } catch (error) {
          console.log(error);

          await profileModel.findOneAndUpdate(
            { userId: interaction.user.id },
            { busy: false }
          );
          await profileModel.findOneAndUpdate(
            { userId: otherUser.id },
            { busy: false }
          );

          await interaction.editReply({
            content: `No result recieved within 60 minutes, cancelling the match.`,
            components: [],
          });
        }
      } else if (result.customId === `result-decline-${otherUser.id}`) {
        await result.update({
          embeds: [],
          components: [],
          content: `${otherUser} has declined ${interaction.user}'s challenge.`,
        });
      }
    } catch (error) {
      console.log(error);

      await profileModel.findOneAndUpdate(
        { userId: interaction.user.id },
        { busy: false }
      );
      await profileModel.findOneAndUpdate(
        { userId: otherUser.id },
        { busy: false }
      );

      await interaction.editReply({
        content: `No response within 5 minutes, cancelling the challenge.`,
        embeds: [],
        components: [],
      });
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
