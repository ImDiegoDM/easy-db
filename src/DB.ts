import * as moment from 'moment';
import * as mysql from 'mysql';
import connection from './dbConection';

export interface IDbFields {
  [key: string]: string;
}

export interface IDbRelationshipObject {
  [key: string]: IDbRelationship;
}

export enum RelationshipTypes {
  hasOne = 'hasOne', 
  hasMany = 'hasMany', 
  belongsTo = 'belongsTo', 
  belongsToMany = 'belongsToMany',
}

export interface IDbRelationship {
  type: RelationshipTypes;
  table: string;
  fields: any;
  hasTimestamps: boolean;
}

export interface IDbRelationshipData {
  type: RelationshipTypes;
  data: any[];
}

export interface IDbRelationshipIterator {
  [key: string]: IDbRelationshipData;
}

export interface IPage {
  actual: number;
  elements: number;
}

function tableWhere(tableName: string, fields: any, whereSql: string, hasTimestamps: boolean = false): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const query = connection.query(
      `SELECT ${mapFields(tableName, fields, hasTimestamps)} FROM ${tableName} WHERE ${whereSql};`,
      (err, result, field) => {
        if (err) { reject(err); }

        resolve(result);
      },
    );
  });
}

function isHidden(field: string): boolean {
  return field.indexOf('hidden') !== -1;
}

function mapFields(tableName: string, fields: any, hasTimestamps: boolean = false, toSave: boolean = false): string {
  let fieldString = toSave ? '' : `${tableName}.id, `;
  const joins: string[] = [];

  for (const key in fields) {
    const element = fields[key];
    if (!isHidden(element) || toSave) {
      fieldString += toSave ? `${key}, ` : `${tableName}.${key}, `;
    }
  }

  if (hasTimestamps) {
    fieldString += `${tableName}.created_at, ${tableName}.modified_at, `;
  }

  return fieldString.slice(0, -2);
}

function ManyToManyTableName(tablesName: string[]){
  const sorted = tablesName.sort(function (a,b){
    if (a.toLowerCase() < b.toLowerCase())
      return -1;
    if ( a.toLowerCase() > b.toLowerCase())
      return 1;
    return 0;
  });

  return `${sorted[0]}_${sorted[1]}`;
}

export class DB {
  
  public static tableName: string;
  public static fields: any;
  public static relantionships: IDbRelationshipObject;
  public static hasTimestamps = false;

  public static toArray<T>(values: T[]): any[][] {
    const arrayValues: any[][] = [];
    for (const iterator of values) {
      const arrayIterator: any[] = [];
      for (const key in iterator) {
        if (iterator.hasOwnProperty(key)) {
          const element = iterator[key];
          arrayIterator.push(element);
        }
      }
      arrayValues.push(arrayIterator);
    }

    return arrayValues;
  }

  public static mapWhereIds(condition: string, ids: string[]): string {
    let where = '';

    for (const iterator of ids) {
      where += `${condition} = ${iterator} OR `;
    }

    return where.slice(0, -4);
  }

  /**
   * Find a object on array that has a key id with the same value with
   * id param and return index of that object
   * @param array 
   * @param id 
   */
  public static findElementById(array: any[], id: string | number) {
    for (const index of array.keys()) {
      if (array[index].id === id) {
        return index;
      }
    }

    return undefined;
  }

  public static combineRelantioshipObjects(objs: any[], childs: IDbRelationshipIterator) {
    let objsClone: any = [...objs];
    for (const key in childs) {
      if (childs.hasOwnProperty(key)) {
        const element = childs[key];
        
        switch (element.type) {
          case 'hasMany':
          case 'hasOne':
            objsClone = objsClone.map((obj: any) => {
              obj[key] = [];
              return obj;
            });

            for (const iterator of element.data) {
              if (iterator.hasOwnProperty(this.tableName + '_id')) {
                const objId = DB.findElementById(objs, parseInt(iterator[this.tableName + '_id']));
                if (objId !== undefined) {
                  objsClone[objId][key].push(iterator);
                } else {
                  console.warn('RelationshipIterator of type hasOne did not find a father element match ');
                }
              } else {
                console.warn('RelationshipIterator of type hasOne dont have property ' + this.tableName + '_id');
              }
            }
            break;
          case 'belongsToMany':
          case 'belongsTo':
            objsClone = objsClone.map((obj: any) => {
              obj[key] = [];
              return obj;
            });

            for (const iterator of element.data) {
              if (iterator.hasOwnProperty('belongsTo')) {
                const objId = DB.findElementById(objs, parseInt(iterator.belongsTo));
                if (objId !== undefined) {
                  objsClone[objId][key].push(iterator);
                } else {
                  console.warn('RelationshipIterator of type belongsTo did not find a element match ');
                }

                delete iterator.belongsTo;
              } else {
                console.warn('RelationshipIterator of type belongsTo dont have property belongsTo');
              }
            }
            break;
        }
      }
    }

    return objsClone;
  }

  public static all(page?: IPage): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let pageQuery = '';

      if (page) {
        pageQuery = ` LIMIT ${page.actual * page.elements},${page.elements}`;
      }
      connection.query(
        `SELECT ${mapFields(this.tableName, this.fields, this.hasTimestamps)} 
        FROM ${this.tableName} 
        ORDER BY ${this.tableName}.id DESC${pageQuery};`,
        async (err, result, field) => {
          if (err) { reject(err); }

          const relantionships = await this.mapRealantionships(result.map((row: any) => {
            return row.id.toString();
          }));

          result = this.combineRelantioshipObjects(result, relantionships);

          resolve(result);
        },
      );
    });
  }

  public static get(id: string|number): Promise<any> {
    return new Promise((resolve, reject) => {
      const query = connection.query({
        sql: `SELECT ${mapFields(this.tableName, this.fields, this.hasTimestamps)} FROM ${this.tableName} WHERE id = ?;`,
        values: [id],
      }, 
      async (err, result, field) => {
        if (err) { reject(err); }

        const relantionships = await this.mapRealantionships(result.map((row: any) => {
          return row.id.toString();
        }));

        result = this.combineRelantioshipObjects(result, relantionships);

        resolve(result[0]);
      });
    });
  }

  public static save(values: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (Array.isArray(values)) {
        const query = connection.query(
          `INSERT INTO ${this.tableName} (${mapFields(this.tableName, this.fields, this.hasTimestamps, true)}) VALUES ?`,
          [this.toArray(values)],
          (err, result) => {
          if (err) { reject(err); }
  
          resolve(result);
          },
        );
      } else {
        connection.query(`INSERT INTO ${this.tableName} SET ?`, values, async (err, result) => {
          if (err) { reject(err); }

          resolve(result);
        });
      }

    });
  }

  public static update(values: any, id: string | number): Promise<any> {
    return new Promise((resolve, reject) => {
      const [fields, valuesArray] = this.mapFieldsValues(values, id);
      connection.query({
        sql: `UPDATE ${this.tableName} SET ${fields} WHERE id = ?;`,
        values: valuesArray,
      }, 
      (err, result, field) => {
        if (err) { reject(err); }

        resolve(result);
      });
    });
  }

  private static async mapRealantionships(ids: string[]): Promise<IDbRelationshipIterator> {
    const relantionships: IDbRelationshipIterator = {};
    for (const key in this.relantionships) {
      const element: string|IDbRelationship = this.relantionships[key];
      switch (element.type) {
        case 'hasOne':
          relantionships[key] = {
            type: RelationshipTypes.hasOne, 
            data: await this.hasOne(element.table, element.fields, ids, element.hasTimestamps),
          };
          break;
        case 'hasMany':
          relantionships[key] = {
            type: RelationshipTypes.hasMany, 
            data: await this.hasMany(element.table, element.fields, ids, element.hasTimestamps),
          };
          break;
        case 'belongsTo':
          relantionships[key] = {
            type: RelationshipTypes.belongsTo, 
            data: await this.belongsTo(element.table, element.fields, ids, element.hasTimestamps),
          };
          break;
        case 'belongsToMany':
          relantionships[key] = {
            type: RelationshipTypes.belongsToMany, 
            data: await this.belongsToMany(element.table, element.fields, ids, element.hasTimestamps),
          };
      }
    }

    return relantionships;
  }

  private static hasOne(table: string, fields: any, ids: string[], hasTimestamps: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      tableWhere(table, fields, DB.mapWhereIds(`${this.tableName}_id`, ids) + 
      ` ORDER BY ${table}.id LIMIT 1`, hasTimestamps).then((result: any) => {
        resolve(result);
      }).catch((err: any) => {
        reject(err);
      });
    });
  }

  public static atach(id:string, table: string, atach_id:string): Promise<any>{
    const joinTableName = ManyToManyTableName([table, this.tableName]);
    return new Promise((resolve,reject)=>{
      connection.query(
        `SELECT ${joinTableName}.${this.tableName}_id, ${joinTableName}.${table}_id
        FROM ${joinTableName}
        WHERE ${joinTableName}.${this.tableName}_id = ? AND ${joinTableName}.${table}_id = ? ;`,[id,atach_id],
        (err, result, field) => {
          if (err) { reject(err); }
          if(result.length==0){
            const query = connection.query(
              `INSERT INTO ${joinTableName} SET ${joinTableName}.${this.tableName}_id = ?, ${joinTableName}.${table}_id = ?`,
              [id,atach_id], (err, result) => {
                if (err) { reject(err); }
    
                resolve();
              }
            );
          }
          else{
            resolve();
          }
        },
      );
    });
  }

  private static hasMany(table: string, fields: string, ids: string[], hasTimestamps: boolean): Promise<any> {
    return new Promise((resolve, reject) => {
      tableWhere(table, fields, DB.mapWhereIds(`${this.tableName}_id`, ids), hasTimestamps).then((result: any) => {
        resolve(result);
      }).catch((err: any) => {
        reject(err);
      });
    });
  }

  private static belongsTo(table: string, fields: any, ids: string[], hasTimestamps: boolean): Promise<any> {
    return new Promise((resolve, reject) => {

      const sql = connection.query(
        `SELECT ${mapFields(table, fields, hasTimestamps)}, ${this.tableName}.id as belongsTo
        FROM ${table} 
        INNER JOIN ${this.tableName} ON ${table}.id = ${this.tableName}.${table}_id
        WHERE ${this.mapWhereIds(`${this.tableName}.id`, ids)};`,
        (err, result, field) => {
          if (err) { reject(err); }
          resolve(result);
        },
      );
    });
  }

  private static belongsToMany(table: string, fields: any, ids: string[], hasTimestamps: boolean, table_name?: string): Promise<any> {
    const joinTableName = table_name ? table_name : ManyToManyTableName([table, this.tableName]);
    return new Promise((resolve, reject)=>{
      connection.query(
        `SELECT ${mapFields(table, fields, hasTimestamps)}, ${joinTableName}.${this.tableName}_id as belongsTo
        FROM ${table} 
        INNER JOIN ${joinTableName} ON ${table}.id = ${joinTableName}.${table}_id
        WHERE ${this.mapWhereIds(`${joinTableName}.${this.tableName}_id`, ids)};`,
        (err, result, field) => {
          if (err) { reject(err); }
          resolve(result);
        },
      );
    });
  }

  private static mapFieldsValues(values: any, id?: string|number) {
    let fields = '';
    const valuesArray = [];

    for (const key in values) {
      fields += `${key} = ?, `;
      valuesArray.push(values[key]);
    }

    if (this.hasTimestamps) {
      fields += `modified_at = ?, `;
      valuesArray.push(moment().format('YYYY-MM-DD HH-mm-ss'));
    }

    if (id) {
      valuesArray.push(id);
    }

    return [fields.slice(0, -2), valuesArray];
  }

  protected connection = connection;

}
