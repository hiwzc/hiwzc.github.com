# Oracle 笔记

## 1. 在线创建索引

参考[《create index注意n如果是大表建立索引，切记加上ONLINE参数》](http://wmcxy.iteye.com/blog/891224)。

```sql
CREATE INDEX XXXDATA.IDX_INFO_DEPT_ENDTIME
    ON XXXDATA.XXX_RENEWAL_INFO (DEPARTMENT_CODE, DATE_INSURANCE_END)
    PARALLEL 8
    INITRANS 16
    ONLINE;

ALTER INDEX XXXDATA.IDX_INFO_DEPT_ENDTIME NOPARALLEL ONLINE;
```

## 2. 使用 Hint 指定索引

```sql
-- 语法
/*+INDEX(TABLE_NAME INDEX_NAME)*/

-- 例如：
SELECT /*+INDEX(T IDX_NAME) */ * FROM T_USER T WHERE T.NAME='xxxxxx';
```

## 3. 授权与回收权限

```sql
GRANT ALL PRIVILEGES ON XXXDATA.BASE_INFO TO XXXOPR;
REVOKE ALL PRIVILEGES ON XXXDATA.BASE_INFO FROM XXXOPR;
GRANT SELECT, UPDATE, INSERT, DELETE ON XXXDATA.BASE_INFO TO R_XXXDATA_DML;
REVOKE SELECT, UPDATE, INSERT, DELETE ON XXXDATA.BASE_INFO TO R_XXXDATA_DML;
```

## 4. 查询 SQL ID 对应的SQL

```sql
SELECT * FROM V$SQL WHERE SQL_ID = 'xxx';
SELECT * FROM V$SQLTEXT WHERE SQL_ID = 'xxx';
```

## 5. 查询绑定变量的值

```sql
  SELECT sn.end_interval_time, sb.name, sb.value_string
    FROM dba_hist_sqlbind sb, dba_hist_snapshot sn
   WHERE sb.sql_id='xxxx'
     AND sb.was_captured='YES'
     AND sn.snap_id=sb.snap_id
ORDER BY sb.snap_id, sb.name, sb.position;
```

## 6. 查询 for update 锁住的表

```sql
SELECT object_name, machine, s.sid, s.serial#
  FROM gv$locked_object l, dba_objects o, gv$session s
 WHERE l.object_id = o.object_id
   AND l.session_id = s.sid;
```

## 7. 计算经纬度距离

使用sdo_distance计算两个坐标点之间的距离。

```sql
select sdo_geom.sdo_distance(
    mdsys.sdo_geometry(2001, 8307, mdsys.sdo_point_type(经度1, 纬度1, 0), null, null),
    mdsys.sdo_geometry(2001, 8307, mdsys.sdo_point_type(经度2, 纬度2, 0), null, null),
    0.5)
from dual;
```

其中2001代表位置为单点，8307代表坐标系为WGS84坐标系，即GPS坐标系，0.5为oracle计算时候的误差精度，单位是米，计算结果单位为米，经纬度说明如下：

中文 | 英文 | 定义 | 取值
--- | --- | --- | ---
经度 | longitude | 地球表面某点随地球自转所形成的轨迹    | 0-90°，赤道0°，北纬为正数，南纬为负数。
纬度 | latitude  | 地球表面连接南北两极的大圆线上的半圆弧 | 0-180°，本初子午线0°，东经正数，西经为负数

## 8. 查询表及表注释

```sql
SELECT t.owner, t.table_name, a.comments
  FROM all_tables t, all_tab_comments a
 WHERE t.table_name = a.table_name
   AND t.table_name like 'EDR_%'
```

## 9. PL/SQL 格式示例

```sql
declare
    type task_id_list_type is varray(1000) of varchar2(20);

    taskIdList     task_id_list_type;
    v_demo_clob    clob;
    v_taskId       varchar(20);
begin
    taskIdList := task_id_list_type(
        '12345678901234567890',
        '12345678901234567891',
        '12345678901234567892'
    );

    select t.detail
     into v_demo_clob
     from t_demo
    where t.id = 'id';

    for i in 1 .. taskIdList.count loop
        v_taskId := taskIdList(i);
        insert into t_wait
            select * from t_fail a
            where a.task_id = v_taskId;
        delete from t_fail a where a.task_id = v_taskId;
    end loop;
end;
/
```

## 10. 动态执行 SQL


DBMS_SQL能够支持输入和输出数量不确定的动态SQL（ dynamic SQL statements with an unknown number of inputs or outputs）。本部分来源[《DBMS_SQL使用》](https://www.cnblogs.com/zjfjava/p/7979633.html)，也可参考Oracle的官方文档[《DBMS_SQL》](https://docs.oracle.com/cd/B28359_01/appdev.111/b28419/d_sql.htm#i1028953)。

### 利用DBMS_SQL执行DDL语句

```sql
create or replace procedure createtable2(tablename varchar2) is
    sql_string varchar2(1000);                              -- 存放sql语句
    v_cur integer;                                          -- 定义整形变量，用于存放游标
begin
    sql_string := 'create table ' || tablename || '(namevarchar(20))';
    v_cur := dbms_sql.open_cursor;                          -- 打开游标
    dbms_sql.parse(v_cur,sql_string,dbms_sql.native);       -- 解析并执行sql语句
    dbms_sql.close_cursor(v_cur);                           -- 关闭游标
END;
```

### 利用DBMS_SQL执行SELECT语句

基本流程是：

open cursor  =>  parse  =>  define column  =>  excute  =>  fetch rows  =>  close cursor

```sql
declare
    v_cursor number;                                        -- 游标id
    sqlstring varchar2(200);                                -- 用于存放sql语句
    v_phone_name varchar2(20);                              -- 手机名字
    v_producer varchar2(20);                                -- 手机生产商
    v_price  number := 500;                                 -- 手机价钱
    v_count int;                                            -- 在这里无意义，只是存放函数返回值
begin
    --:p是占位符
    --select 语句中的第1列是phone_name, 第2列是producer, 第3列是price
    sqlstring := 'select phone_name, producer, price from phone_infor where price> :p';
    v_cursor := dbms_sql.open_cursor;                       -- 打开游标；
    dbms_sql.parse(v_cursor, sqlstring, dbms_sql.native);   -- 解析动态sql语句；

    --绑定输入参数，v_price的值传给 :p
    dbms_sql.bind_variable(v_cursor,':p', v_price);

    --定义列，v_phone_name对应select 语句中的第1列
    dbms_sql.define_column(v_cursor,1,v_phone_name,20);
    --定义列，v_producer对应select语句中的第2列
    dbms_sql.define_column(v_cursor,2,v_producer,20);
    --定义列，v_price对应select语句中的第3列
    dbms_sql.define_column(v_cursor,3,v_price);

    v_count := dbms_sql.execute(v_cursor);                  -- 执行动态sql语句。

    loop
        --从游标中把数据检索到缓存区（buffer）中，缓冲区的值只能被函数coulumn_value()所读取
        exit whendbms_sql.fetch_rows(v_cursor)<=0;
        --函数column_value()把缓冲区的列的值读入相应变量中。
        --第1列的值被读入v_phone_name中
        dbms_sql.column_value(v_cursor,1,v_phone_name);
        --第2列的值被读入v_producer中
        dbms_sql.column_value(v_cursor,2,v_producer);
        --第2列的值被读入v_price中
        dbms_sql.column_value(v_cursor,3,v_price);
        --打印变量的值
        dbms_output.put_line(v_phone_name || ' '||v_producer|| ' '||v_price);
    end loop;

    dbms_sql.close_cursor(v_cursor);                        -- 关闭游标
end;
```

### 利用DBMS_SQL执行DML语句

基本流程是：

open cursor  =>  parse  =>  bind variable  =>  execute  =>  close  cursor

```sql
declare
    v_cursor number;                                        -- 游标id
    sqlstring varchar2(200);                                -- 用于存放sql语句
    v_phone_name varchar2(20);                              -- 手机名字
    v_producer varchar2(20);                                -- 手机生产商
    v_price  number :=500;                                  -- 手机价钱
    v_count int;                                            -- 被dml语句影响的行数
begin
    sqlstring := 'insert into phone_infor values(:a,:b,:c)';

    v_phone_name := 's123';
    v_producer := '索尼aa';
    v_price := 999;

    v_cursor :=dbms_sql.open_cursor;                        -- 打开游标；
    dbms_sql.parse(v_cursor, sqlstring, dbms_sql.native);   -- 解析动态sql语句；

    dbms_sql.bind_variable(v_cursor,':a',v_phone_name);     -- 绑定输入参数
    dbms_sql.bind_variable(v_cursor,':b',v_producer);
    dbms_sql.bind_variable(v_cursor,':c',v_price);

    v_count := dbms_sql.execute(v_cursor);                  -- 执行动态sql语句。

    dbms_sql.close_cursor(v_cursor);                        -- 关闭游标
    dbms_output.put_line(' insert ' || to_char(v_count) ||' row ');
    commit;
end;
```

