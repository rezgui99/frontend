'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
 await queryInterface.createTable('JobEmployeeSkillMatches', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      job_description_id: {
        type: Sequelize.INTEGER,
        references: { model: 'JobDescriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: true
      },
      employee_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: true
      },
      skill_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Skills', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        allowNull: true
      },
      required_skill_level_value: { type: Sequelize.INTEGER },
      actual_skill_level_value: { type: Sequelize.INTEGER },
      skill_match_score: { type: Sequelize.INTEGER },
      calculated_result: { type: Sequelize.JSON },
      calculated_at: { type: Sequelize.DATE },
      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down (queryInterface, Sequelize) {
       await queryInterface.dropTable('JobEmployeeSkillMatches');
  }
};
