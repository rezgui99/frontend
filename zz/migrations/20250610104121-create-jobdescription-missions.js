"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("JobDescriptionMissions", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      jobDescriptionId: {
        type: Sequelize.INTEGER,
        references: { model: "JobDescriptions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      missionId: {
        type: Sequelize.INTEGER,
        references: { model: "Missions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: Sequelize.DATE,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("JobDescriptionMissions");
  },
};
