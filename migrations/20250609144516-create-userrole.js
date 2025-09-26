'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('UserRoles', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false
      },
      role_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: 'Roles', key: 'id' },
        onDelete: 'CASCADE',
        allowNull: false
      },
      assigned_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onDelete: 'SET NULL'
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
    await queryInterface.dropTable('UserRoles');
  }
};
