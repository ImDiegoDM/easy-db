import { DB, IDbFields, IDbRelationship, IDbRelationshipObject, RelationshipTypes } from '../DB';
import conection from '../dbConection';

class UsersBT extends DB {
  public static tableName = 'usersBT';
  public static fields = {
    name: '',
    email: '',
  };

}

// tslint:disable-next-line:max-classes-per-file
class PhonesBT extends DB {
  public static tableName = 'phonesBT';
  public static fields = {
    number: '',
    usersBT_id: '',
  };

  public static relantionships = {
    usersBT: {
      type: RelationshipTypes.belongsTo,
      table: 'usersBT',
      fields: {
        name: '',
        email: '',
      },
      hasTimestamps: false,
    },
  };
}

describe('Relantionship has one test', () => {
  
  beforeAll(() => {
    return new Promise((res, rej) => {
      conection.query(`CREATE TABLE usersBT(
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
      conection.query(`CREATE TABLE phonesBT(
        id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        number VARCHAR(30) NOT NULL,
        usersBT_id INT(6) UNSIGNED NOT NULL
      )`, (err: any) => {
        if (err) {
          rej(err);
        }
        res();
      });
    });
  });

  test('should return phone and his relantionships', async () => {

    await UsersBT.save([
      {
        name: 'diego',
        email: 'contato@diegomatias.com.br',
      },
      {
        name: 'douglas',
        email: 'contato@diegomatias.com.br',
      },
    ]);

    await PhonesBT.save([
      {
        number: '124654131',
        users_id: '1',
      },
      {
        number: '32132654',
        users_id: '2',
      },
      {
        number: '65654',
        users_id: '1',
      },
    ]);

    const phonesAll = await PhonesBT.all();

    expect(phonesAll[0]).toHaveProperty('usersBT');
    expect(phonesAll[0].usersBT).toMatchSnapshot();
  });

  afterEach( () => {
    return new Promise((res, rej) => {
      conection.query(`DELETE FROM phonesBT;`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.query(`DELETE FROM phonesBT;`, (errP) => {
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
      conection.query(`DROP TABLE usersBT, phonesBT`, (err: any) => {
        if (err) {
          rej(err);
        }
        conection.end();
        res();
      });
    });
  });
});
