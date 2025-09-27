'use strict';

/*
  # Create candidate CVs table

  1. New Tables
    - `CandidateCVs`
      - `id` (integer, primary key)
      - `candidate_id` (integer, foreign key)
      - `title` (string)
      - `file_path` (string)
      - `file_name` (string)
      - `file_size` (integer)
      - `is_primary` (boolean)
      - `createdAt` (date)
      - `updatedAt` (date)
  
  2. Security
    - Enable foreign key constraint to Candidates
    - Add cascade delete
*/

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('CandidateCVs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      candidate_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Candidates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 100]
        }
      },
      file_path: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('CandidateCVs');
  }
};