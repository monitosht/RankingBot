const { Events } = require("discord.js");
const profileModel = require("../models/profileSchema");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Return if the interaction is not a (/) command
    if (interaction.isChatInputCommand()) {
      // Get user database information to pass into the command
      let profileData;

      try {
        // Attempt to find a profile within the database that matches the user
        profileData = await profileModel.findOne({
          userId: interaction.user.id,
        });

        // If a profile does not already exist, create a new profile for the user
        if (!profileData) {
          profileData = await profileModel.create({
            userId: interaction.user.id,
            serverId: interaction.guild.id,
          });
        }
      } catch (err) {
        console.log(err);
      }

      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        await command.execute(interaction, profileData);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);
      }
    } else if (interaction.isButton()) {
      let message = "";

      if (interaction.customId.startsWith(`result`)) {
        message = "Only the user being challenged can respond.";
      } else if (interaction.customId.startsWith(`outcome`)) {
        message = "Only the creator of the challenge can enter the result.";
      }

      if (!interaction.customId.endsWith(interaction.user.id)) {
        return interaction.reply({
          content: message,
          ephemeral: true,
        });
      }
    }
  },
};
