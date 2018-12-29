import { DB, IDbFields, IDbRelationship, IDbRelationshipObject, RelationshipTypes } from '../DB';
import conection from '../dbConection';

class Cells extends DB {
  public static tableName = 'cells';
  public static fields = {
    number: '',
    peoples_id: '',
  };
}

// tslint:disable-next-line:max-classes-per-file
class Peoples extends DB {
  public static tableName = 'peoples';
  public static fields = {
    name: '',
    email: '',
  };

  public static relantionships = {
    cells: {
      type: RelationshipTypes.hasMany,
      table: 'cells',
      fields : {
        number: '',
        peoples_id: '',
      },
      hasTimestamps: false,
    },
  };
}

describe('Relantionship has one test', () => {
  
  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE peoples(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(30) NOT NULL,
        email VARCHAR(50)
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE cells(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        number VARCHAR(30) NOT NULL,
        peoples_id INT(6) UNSIGNED NOT NULL
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  test('should return users and his relantionships', async () => {
    const result = await Peoples.save({
      name: 'diego',
      email: 'contato@diegomatias.com.br',
    });

    const id = result.insertId;

    await Cells.save([
      {
        number: '124654131',
        users_id: id,
      },
      {
        number: '32132654',
        users_id: id,
      },
      {
        number: '65654',
        users_id: id + 10,
      },
    ]);

    const user = await Peoples.get(id);

    expect(user).toHaveProperty('cells');
    expect(user.cells).toHaveLength(2);
  });

  afterEach( () => {
    return new Promise((res, rej) => {
      conection.query(`DELETE FROM cells;`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.query(`DELETE FROM cells;`, (errP) => {
          if (errP) {
            rej(errP);
          }
          res();
        });
      });
    });
  });
  
  afterAll(() => {
    
    return new Promise((res, rej) => {
      conection.query(`DROP TABLE peoples, cells`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.end();
        res();
      });
    });
  });
});
