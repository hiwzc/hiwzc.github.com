---
title: SpringBoot杂项
toc: true
permalink: /posts/springboot-misc.html
categories: Spring框架
date: 2019-01-01
---

## 启动 Banner

### 1. 创建字符画

可以到 <http://patorjk.com/software/taag/> 创建，个人比较喜欢的字体是 Big、Doom、Standard、Star Wars、Ivrit，这几款字体比较规整，Character Width 和 Character Height 配置为 Full。字符画保存到 src/main/resources/banner.txt 文件中

```text
  _    _   _____  __          __  ______   _____
 | |  | | |_   _| \ \        / / |___  /  / ____|
 | |__| |   | |    \ \  /\  / /     / /  | |
 |  __  |   | |     \ \/  \/ /     / /   | |
 | |  | |  _| |_     \  /\  /     / /__  | |____
 |_|  |_| |_____|     \/  \/     /_____|  \_____|
```

### 2. 使用变量

| 变量                             | 值示例            |
| -------------------------------- | ----------------- |
| ${spring-boot.formatted-version} | (v2.1.11.RELEASE) |
| ${spring-boot.version}           | 2.1.11.RELEASE    |
| ${application.formatted-version} | (v1.0.0)          |
| ${application.version}           | 1.0.0             |
| ${application.title}             | My application    |

### 3. 使用颜色

使用类似 `${AnsiColor.BRIGHT_RED}` 指定前景色;

使用类似 `${AnsiBackground.WHITE}` 指定背景色彩;

使用类似 `${AnsiStyle.BOLD}` 指定字体；

这些可用的值定义在 `org.springframework.boot.ansi` 包下相应的类里。
