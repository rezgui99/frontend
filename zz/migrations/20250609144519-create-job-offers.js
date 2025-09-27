'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('JobOffers', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      
      title: { type: Sequelize.STRING, allowNull: false },
      company: { type: Sequelize.STRING, allowNull: false },
      location: { type: Sequelize.STRING, allowNull: false },
      salary_min: { type: Sequelize.INTEGER, allowNull: true },
      salary_max: { type: Sequelize.INTEGER, allowNull: true },
      contract_type: { 
        type: Sequelize.ENUM('CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'), 
        allowNull: false, 
        defaultValue: 'CDI' 
      },
      work_mode: { 
        type: Sequelize.ENUM('Présentiel', 'Télétravail', 'Hybride', 'Flexible'), 
        allowNull: false, 
        defaultValue: 'Hybride' 
      },
      application_deadline: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      requirements: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },
      benefits: { type: Sequelize.JSON, allowNull: true, defaultValue: [] },

      job_description_id: {
        type: Sequelize.INTEGER,
        references: { model: 'JobDescriptions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false
      },
      status: { 
        type: Sequelize.ENUM('draft', 'published', 'closed'), 
        allowNull: false, 
        defaultValue: 'draft' 
      },
      created_by: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        allowNull: false
      },
      published_at: { type: Sequelize.DATE, allowNull: true },
      views_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      applications_count: { type: Sequelize.INTEGER, defaultValue: 0 },

      createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.literal('NOW()') }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('JobOffers');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_JobOffers_contract_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_JobOffers_work_mode";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_JobOffers_status";');
  }
};
