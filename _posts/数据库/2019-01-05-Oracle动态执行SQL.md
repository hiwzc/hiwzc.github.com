---
title: Oracle 动态执行 SQL
toc: true
permalink: /posts/oracle/dbms_sql.html
categories: 数据库
date: 2019-01-05
---

DBMS_SQL能够支持输入和输出数量不确定的动态SQL（ dynamic SQL statements with an unknown number of inputs or outputs）。本部分来源[《DBMS_SQL使用》](https://www.cnblogs.com/zjfjava/p/7979633.html)，也可参考Oracle的官方文档[《DBMS_SQL》](https://docs.oracle.com/cd/B28359_01/appdev.111/b28419/d_sql.htm#i1028953)。

## 利用DBMS_SQL执行DDL语句

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

## 利用DBMS_SQL执行SELECT语句

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

## 利用DBMS_SQL执行DML语句

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
