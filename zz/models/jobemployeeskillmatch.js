"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JobEmployeeSkillMatch extends Model {
    static associate(models) {
      JobEmployeeSkillMatch.belongsTo(models.JobDescription, {
        foreignKey: "job_description_id",
        as: "JobDescription",
      });
      JobEmployeeSkillMatch.belongsTo(models.Employee, {
        foreignKey: "employee_id",
        as: "Employee",
      });
      JobEmployeeSkillMatch.belongsTo(models.Skill, {
        foreignKey: "skill_id",
        as: "Skill",
      });
    }
  }

  JobEmployeeSkillMatch.init(
    {
      job_description_id: DataTypes.INTEGER,
      employee_id: DataTypes.INTEGER,
      skill_id: DataTypes.INTEGER,
      required_skill_level_value: DataTypes.INTEGER,
      actual_skill_level_value: DataTypes.INTEGER,
      skill_match_score: DataTypes.FLOAT,
      calculated_at: DataTypes.DATE,
    },
    {
      sequelize,
      modelName: "JobEmployeeSkillMatch",
      tableName: "JobEmployeeSkillMatches",
    }
  );

  return JobEmployeeSkillMatch;
};
