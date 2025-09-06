"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class UserRole extends Model {
    static associate(models) {
      UserRole.belongsTo(models.User, {
        foreignKey: "user_id",
        as: "user"
      });
      UserRole.belongsTo(models.Role, {
        foreignKey: "role_id",
        as: "role"
      });
    }
  }

  UserRole.init(
    {
      user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      role_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
          model: 'Roles',
          key: 'id'
        }
      },
      assigned_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      assigned_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        }
      }
    },
    {
      sequelize,
      modelName: "UserRole",
      tableName: "UserRoles",
    }
  );

  return UserRole;
};