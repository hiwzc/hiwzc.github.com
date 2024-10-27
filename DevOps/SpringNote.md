# Spring 笔记

## Spring 组件注册的四种方法

### 1. 包扫描

包扫描@ComponentScan + 组件标注注解（@Controller/@Service/@Repository/@Component）

@ComponentScan  value:指定要扫描的包
excludeFilters = Filter[] ：指定扫描的时候按照什么规则排除那些组件
includeFilters = Filter[] ：指定扫描的时候只需要包含哪些组件
FilterType.ANNOTATION：按照注解
FilterType.ASSIGNABLE_TYPE：按照给定的类型；
FilterType.ASPECTJ：使用ASPECTJ表达式
FilterType.REGEX：使用正则指定
FilterType.CUSTOM：使用自定义规则

### 2. @Configuration + @Bean注解

```java
@Configuration
public class DemoConfiguration {
    @Lazy
    @Scope("singleton")
    @Bean(initMethod = "initMethod", destroyMethod = "destroyMethod")
    public DemoBean demoBean() {
        DemoBean demoBean = new DemoBean();
        demoBean.setDemoProperty("demo");
        return demoBean;
    }
}
```

### 3. @Import注解

@Import注解在Spring框架的代码中使用非常多，有三种使用方式：

1. @Import(组件的全类名)：容器自动注册这个类，bean的Id默认是全类名；
2. @Import(ImportSelector)：ImportSelector接口的selectImports方法返回需要导入的组件的全类名数组，bean的Id默认也是全类名；
3. @Import(ImportBeanDefinitionRegistrar)：手动注册bean到容器中
  
以下代码演示了三种使用方式，beanName 和对应的 Class 如下

```text
com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassA  ->  com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassA
com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassB  ->  com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassB
demoImportClassC  ->  com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassC
```

```java
@Configuration
@Import({DemoImportClassA.class, DemoImportSelector.class, DemoImportBeanDefinitionRegistrar.class})
public class DemoConfiguration {
    // ....
}
```

DemoImportSelector 的代码如下

```java
public class DemoImportSelector implements ImportSelector {
    @Override
    public String[] selectImports(AnnotationMetadata importingClassMetadata) {
        return new String[]{"com.hiwzc.spring.lifecycle.demo.bean.DemoImportClassB"};
    }
}
```

DemoImportBeanDefinitionRegistrar 的代码如下，其中AnnotationMetadata是当前标注Import的类的注解信息。

```java
public class DemoImportBeanDefinitionRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        BeanDefinition beanDefinition = new RootBeanDefinition(DemoImportClassC.class);
        registry.registerBeanDefinition("demoImportClassC", beanDefinition);
    }
}
```

### 4. FactoryBean

默认获取到的是工厂bean调用getObject创建的对象

要获取工厂Bean本身，我们需要给id前面加一个&

```java
public class DemoFactoryBean implements FactoryBean<DemoClassForFactoryBean> {
    @Override
    public DemoClassForFactoryBean getObject() throws Exception {
        return new DemoClassForFactoryBean();
    }

    @Override
    public Class<?> getObjectType() {
        return DemoClassForFactoryBean.class;
    }

    @Override
    public boolean isSingleton() {
        return true;
    }
}
```

beanName及其对应的类型如下：

```text
demoFactoryBean  ->  com.hiwzc.spring.lifecycle.demo.bean.DemoClassForFactoryBean
&demoFactoryBean  ->  com.hiwzc.spring.lifecycle.demo.bean.DemoFactoryBean
```
## Import注解

Import注解主要用于支持模块化配置，主要有三种用法，下面用一个ImportTest类简述这三种用法。

注意：Import可以支持导入多个，下面仅仅演示一个的情况。

```java
public class ImportTest {
    public void foo() {
        System.out.println("Import Test");
    }
}
```

```java
public static void test() {
    AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
    ImportTest test = context.getBean(ImportTest.class);
    test.foo();
}
```

1、Import一个类，将创建这个类的Bean

```java
@Configuration
@Import(ImportTest.class)
public class AppConfig {
}
```

也可以将Bean定义在一个配置类中，Import这个配置类，比如

```java
@Configuration
public class ImportConfig {
    @Bean
    public ImportTest importTest() {
        return new ImportTest();
    }
}
```

```java
@Configuration
@Import(ImportConfig.class)
public class AppConfig {
}
```

2、Import实现了ImportSelector的类

实现ImportTestSelector的selectImports方法，返回要导入的类的全限定名。

```java
public class ImportTestSelector implements ImportSelector {
    @Override
    public String[] selectImports(AnnotationMetadata annotationMetadata) {
        return new String[]{"org.example.ImportTest"};
    }
}
```

```java
@Configuration
@Import(ImportTestSelector.class)
public class AppConfig {
}
```

3、Import实现了ImportBeanDefinitionRegistrar的类

实现ImportBeanDefinitionRegistrar的registerBeanDefinitions，直接注册BeanDefinition。

```java
public class ImportTestRegistrar implements ImportBeanDefinitionRegistrar {
    @Override
    public void registerBeanDefinitions(AnnotationMetadata importingClassMetadata, BeanDefinitionRegistry registry) {
        GenericBeanDefinition definition = new GenericBeanDefinition();
        definition.setBeanClass(ImportTest.class);
        registry.registerBeanDefinition("importTest", definition);
    }
}
```

```java
@Configuration
@Import(ImportTestRegistrar.class)
public class AppConfig {
}
```

## AOP执行顺序

从5.2.7开始，AOP的执行顺序如下：

```text
-- 单个切面正常返回
AspectA Around Start
AspectA Before
Target Method
AspectA AfterReturning
AspectA After
AspectA Around End

-- 单个切面发生异常
AspectA Around Start
AspectA Before
Target Method
AspectA AfterThrowing
AspectA After
AspectA Around Exception

-- 多个切面正常返回
AspectA Around Start
AspectA Before
AspectB Around Start
AspectB Before
Target Method
AspectB AfterReturning
AspectB After
AspectB Around End
AspectA AfterReturning
AspectA After
AspectA Around End

-- 多个切面发生异常
AspectA Around Start
AspectA Before
AspectB Around Start
AspectB Before
Target Method
AspectB AfterThrowing
AspectB After
AspectB Around Exception
AspectA AfterThrowing
AspectA After
AspectA Around Exception
```

AOP拦截器执行链

```text
ReflectiveMethodInvocation
this.interceptorsAndDynamicMethodMatchers = ArrayList
0 = ExposeInvocationInterceptor
1 = AspectJAroundAdvice
2 = MethodBeforeAdviceInterceptor
3 = AspectJAfterAdvice
4 = AfterReturningAdviceInterceptor
5 = AspectJAfterThrowingAdvice
```

5.2.6 的执行情况如下

```text
-- 单个切面正常返回
AspectA Around Start
AspectA Before
Target Method
AspectA Around End
AspectA After
AspectA AfterReturning

-- 单个切面发生异常
AspectA Around Start
AspectA Before
Target Method
AspectA Around Exception
AspectA After
AspectA AfterThrowing

-- 多个切面正常返回
AspectA Around Start
AspectA Before
AspectB Around Start
AspectB Before
Target Method
AspectB Around End
AspectB After
AspectB AfterReturning
AspectA Around End
AspectA After
AspectA AfterReturning

-- 多个切面发生异常
AspectA Around Start
AspectA Before
AspectB Around Start
AspectB Before
Target Method
AspectB Around Exception
AspectB After
AspectB AfterThrowing
AspectA Around Exception
AspectA After
AspectA AfterThrowing
```

AOP拦截器执行链

```text
ReflectiveMethodInvocation
this.interceptorsAndDynamicMethodMatchers = ArrayList
0 = ExposeInvocationInterceptor
1 = AspectJAfterThrowingAdvice
2 = AfterReturningAdviceInterceptor
3 = AspectJAfterAdvice
4 = AspectJAroundAdvice
5 = MethodBeforeAdviceInterceptor
```

测试程序如下

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Aspect
@Order(1)
public class AspectA {
    
    @Pointcut("execution(* AopTest.*(..))")
    public void pointcut() {
    }

    @Around("pointcut()")
    public void around(ProceedingJoinPoint pjp) {
        try {
            System.out.println("AspectA Around Start");
            pjp.proceed();
            System.out.println("AspectA Around End");
        } catch (Throwable e) {
            System.out.println("AspectA Around Exception");
            throw new RuntimeException(e);
        }
    }

    @Before("pointcut()")
    public void before() {
        System.out.println("AspectA Before");
    }

    @After("pointcut()")
    public void after() {
        System.out.println("AspectA After");
    }

    @AfterReturning("pointcut()")
    public void AfterReturning() {
        System.out.println("AspectA AfterReturning");
    }

    @AfterThrowing("pointcut()")
    public void afterThrowing() {
        System.out.println("AspectA AfterThrowing");
    }
    
}
```

```java
import org.springframework.stereotype.Component;

@Component
public class AopTest {

    public void testReturn() {
        System.out.println("Target Method");
    }

    public void testThrowing() {
        System.out.println("Target Method");
        throw new RuntimeException("Throwing Exception");
    }
    
}
```

```java
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@Configuration
@ComponentScan
@EnableAspectJAutoProxy
public class AppConfig {
}
```

```java
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

public static void test() {
    AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
    AopTest aopTest = context.getBean(AopTest.class);
    aopTest.testReturn();
    aopTest.testThrowing();
}
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>org.example</groupId>
    <artifactId>aop-test</artifactId>
    <version>1.0-SNAPSHOT</version>

    <properties>
        <maven.compiler.source>8</maven.compiler.source>
        <maven.compiler.target>8</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <spring.version>5.2.7.RELEASE</spring.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-context</artifactId>
            <version>${spring.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-aop</artifactId>
            <version>${spring.version}</version>
        </dependency>
        <dependency>
            <groupId>org.springframework</groupId>
            <artifactId>spring-aspects</artifactId>
            <version>${spring.version}</version>
        </dependency>
    </dependencies>

</project>
```

## Spring 的注入方式

Spring支持三种注入方式：constructor注入、setter注入、field注入。

Spring团队建议是：强制依赖使用构造器注入，可变可选的依赖使用setter注入，不建议使用field注入。setter注入建议为依赖提供合理的默认值。

构造器注入有如下优势：

- 可以将依赖注入到final变量
- 可以保证依赖不会是null，保证被调用时依赖已经准备好了
- 防止代码异味，巨大的构造方法通常意味着代码异味，即这个类可能承担了太多的职责
- 类可以在容器外使用，比如方便单元测试Mock


## Spring 支持的注入注解

@Autowired、@Resource、@Inject

@Autowired是Spring提供注解，Autowired先按type注入，当有多个候选时，如果有Qualifier注解，则按Qualifier指定的name注入，如果没有Qualifier注解，则按照变量名匹配，如果匹配不到，且Autowired的required没有设置为false，则抛出异常。

@Inject是JSR-330定义的，Inject没有required属性，其他跟Autowired一样，代码都是AutowiredAnnotationBeanPostProcessor实现的。

@Resource是JSR-250定义的，有name和type两个属性，有指定时按指定的匹配，没有指定时优先byName匹配，然后按byType匹配，Spring中由CommonAnnotationBeanPostProcessor实现。

## SpringMVC

### DispatcherServlet 及 HandlerInterceptor 的执行顺序

下面是DispatcherServlet和HandlerExecutionChain的核心代码，从代码可以看出DispatcherServlet及HandlerInterceptor的执行顺序。

请注意HandlerInterceptor的执行顺序，HandlerInterceptor中有三个方法，执行顺序的要点如下：

- preHandler在进入请求方法之前执行，postHandler在请求方法执行完成之后执行，afterCompletion在视图渲染后执行 
- 多个preHandle按拦截器定义的顺序被调用，postHandle和afterCompletion按拦截器定义的逆序被调用
- postHandle需要截器链内所有拦截器都返回true才会被调用，只要有一个返回false就不会调用postHandle 
- afterCompletion只有在preHandle返回true时才会被调用

也就是说，一旦某个拦截器的preHandler返回false，则这个拦截器的afterCompletion，及后续拦截器的preHandler、afterCompletion，及所有拦截器的postHandle都不会被调用。

```java
// DispatcherServlet
void doDispatch(HttpServletRequest request, HttpServletResponse response) {
    try {
        mappedHandler = getHandler(processedRequest);
        
        HandlerAdapter ha = getHandlerAdapter(mappedHandler.getHandler());
        
        if (!mappedHandler.applyPreHandle(processedRequest, response)) {
            return;
        }

        mv = ha.handle(processedRequest, response, mappedHandler.getHandler());
        
        mappedHandler.applyPostHandle(processedRequest, response, mv);

        processDispatchResult(processedRequest, response, mappedHandler, mv, dispatchException);
    }
    catch (Exception ex) {
        triggerAfterCompletion(processedRequest, response, mappedHandler, ex);
    }
}

private void processDispatchResult() throws Exception {
    render(mv, request, response);
    if (mappedHandler != null) {
        mappedHandler.triggerAfterCompletion(request, response, null);
    }
}
```

```java
// HandlerExecutionChain
boolean applyPreHandle(HttpServletRequest request, HttpServletResponse response) {
    HandlerInterceptor[] interceptors = getInterceptors();
    if (!ObjectUtils.isEmpty(interceptors)) {
        for (int i = 0; i < interceptors.length; i++) {
            HandlerInterceptor interceptor = interceptors[i];
            if (!interceptor.preHandle(request, response, this.handler)) {
                triggerAfterCompletion(request, response, null);
                return false;
            }
            this.interceptorIndex = i;
        }
    }
    return true;
}

void applyPostHandle() {
    HandlerInterceptor[] interceptors = getInterceptors();
    if (!ObjectUtils.isEmpty(interceptors)) {
        for (int i = interceptors.length - 1; i >= 0; i--) {
            HandlerInterceptor interceptor = interceptors[i];
            interceptor.postHandle(request, response, this.handler, mv);
        }
    }
}

void triggerAfterCompletion() {
    HandlerInterceptor[] interceptors = getInterceptors();
    if (!ObjectUtils.isEmpty(interceptors)) {
        for (int i = this.interceptorIndex; i >= 0; i--) {
            HandlerInterceptor interceptor = interceptors[i];
            try {
                interceptor.afterCompletion(request, response, this.handler, ex);
            }
            catch (Throwable ex2) {
                logger.error("HandlerInterceptor.afterCompletion threw exception", ex2);
            }
        }
    }
}
```

## SpringBoot 自定义 Banner

### 创建字符画

可以到 <http://patorjk.com/software/taag/> 创建，个人比较喜欢的字体是 Big、Doom、Standard、Star Wars、Ivrit，这几款字体比较规整，Character Width 和 Character Height 配置为 Full。字符画保存到 src/main/resources/banner.txt 文件中

```text
  _    _   _____  __          __  ______   _____
 | |  | | |_   _| \ \        / / |___  /  / ____|
 | |__| |   | |    \ \  /\  / /     / /  | |
 |  __  |   | |     \ \/  \/ /     / /   | |
 | |  | |  _| |_     \  /\  /     / /__  | |____
 |_|  |_| |_____|     \/  \/     /_____|  \_____|
```

### 使用变量

| 变量                             | 值示例            |
| -------------------------------- | ----------------- |
| ${spring-boot.formatted-version} | (v2.1.11.RELEASE) |
| ${spring-boot.version}           | 2.1.11.RELEASE    |
| ${application.formatted-version} | (v1.0.0)          |
| ${application.version}           | 1.0.0             |
| ${application.title}             | My application    |

### 使用颜色

使用类似 `${AnsiColor.BRIGHT_RED}` 指定前景色;

使用类似 `${AnsiBackground.WHITE}` 指定背景色彩;

使用类似 `${AnsiStyle.BOLD}` 指定字体；

这些可用的值定义在 `org.springframework.boot.ansi` 包下相应的类里。

## Window 命令行启动 SpringBoot 应用

主要是方便本地调试。

### 使用 spring-boot 插件

spring-boot-maven-plugin-2.2.2.RELEASE

```bat
@ECHO OFF
SETLOCAL

REM 请设置基本环境变量
SET JAVA_HOME=C:\Program Files (x86)\Java\jdk1.8.0_45
SET M2_HOME=C:\Program Files (x86)\apache-maven-3.6.3
SET DEBUG_PORT=8888
SET LOG_PREFIX=D:\log
SET CLEAN_CMD=

REM 自动检测当前目录
SET APP_HOME=%~dp0

REM 自动获取当前目录名
SET APP_NAME=
SET TMP_ARRAY=%APP_HOME:\= %
FOR %%a in (%TMP_ARRAY%) do SET APP_NAME=%%a

REM 日志目录
SET LOG_HOME=%LOG_PREFIX%\%APP_NAME%

REM 设置变量
SET JAVA_OPTS=-Xms1024M -Xmx1024M -Dlog.home=%LOG_HOME%
SET JAVA_DEBUG=-Xdebug -Xnoagent -Xrunjdwp:transport=dt_socket,address=%DEBUG_PORT%,server=y,suspend=n
SET jvmArguments="%JAVA_OPTS% %JAVA_DEBUG%"

ECHO=
ECHO JAVA_HOME=%JAVA_HOME%
ECHO M2_HOME=%M2_HOME%
ECHO APP_HOME=%APP_HOME%
ECHO APP_NAME=%APP_NAME%
ECHO LOG_HOME=%LOG_HOME%
ECHO DEBUG_PORT=%DEBUG_PORT%

IF "%1%"=="c" SET CLEAN_CMD=clean
ECHO CLEAN=%CLEAN_CMD%
IF "%1%"=="h" GOTO HELP

:MAIN
REM 执行程序
CD %APP_HOME% && CALL "%M2_HOME%\bin\mvn" -q -Dmaven.test.skip=true -Dspring-boot.run.noverify=true -Dspring-boot.run.jvmArguments=%jvmArguments% %CLEAN_CMD% spring-boot:run
GOTO END

:HELP
ECHO=
ECHO Usage:
ECHO     start.cmd      compile and start
ECHO     start.cmd c    clean, compile and start
ECHO     start.cmd h    show help
GOTO END

:END
ENDLOCAL
```

### 使用 java 命令

```bat
@ECHO OFF
SETLOCAL

REM 请设置基本环境变量
SET JAVA_HOME=C:\Program Files (x86)\Java\jdk1.8.0_45
SET M2_HOME=C:\Program Files (x86)\apache-maven-3.6.3
SET DEBUG_PORT=8888
SET LOG_PREFIX=D:\log
SET CLEAN_CMD=

REM 自动检测当前目录
SET APP_HOME=%~dp0
SET JAR_HOME=%APP_HOME%target
SET CFG_HOME=D:\wzctmp\java-demo\config

REM 自动获取当前目录名
SET APP_NAME=
SET TMP_ARRAY=%APP_HOME:\= %
FOR %%a in (%TMP_ARRAY%) DO SET APP_NAME=%%a

REM 日志目录
SET LOG_HOME=%LOG_PREFIX%\%APP_NAME%

REM 设置变量
SET JAVA_OPTS=-Xms1024M -Xmx1024M -Dlog.home=%LOG_HOME%
SET JAVA_DEBUG=-Xdebug -Xnoagent -Xrunjdwp:transport=dt_socket,address=%DEBUG_PORT%,server=y,suspend=n
SET jvmArguments="%JAVA_OPTS% %JAVA_DEBUG%"

ECHO=
ECHO JAVA_HOME=%JAVA_HOME%
ECHO M2_HOME=%M2_HOME%
ECHO APP_HOME=%APP_HOME%
ECHO APP_NAME=%APP_NAME%
ECHO JAR_HOME=%JAR_HOME%
ECHO CFG_HOME=%CFG_HOME%
ECHO LOG_HOME=%LOG_HOME%
ECHO DEBUG_PORT=%DEBUG_PORT%

IF "%1%"=="c" SET CLEAN_CMD=clean
ECHO CLEAN=%CLEAN_CMD%
IF "%1%"=="h" GOTO HELP

:MAIN
REM 打包
CD %APP_HOME% && CALL "%M2_HOME%\bin\mvn" -q -Dmaven.test.skip=true %CLEAN_CMD% package

REM 查找JAR_FILE
IF EXIST %JAR_HOME% CD %JAR_HOME% && FOR %%i in (*.jar) DO SET JAR_FILE=%%i
IF "%JAR_FILE%"=="" echo ****** COMPILE ERROR ****** && GOTO END
ECHO JAR_FILE=%JAR_FILE%

REM 设置CLASSPATH
SET CLASSPATH=%CFG_HOME%;%JAR_HOME%\%JAR_FILE%
ECHO CLASSPATH=%CLASSPATH%

REM 执行程序
CALL "%JAVA_HOME%\bin\java" %JAVA_OPTS% %JAVA_DEBUG% -cp %CLASSPATH% org.springframework.boot.loader.JarLauncher

GOTO END

:HELP
ECHO=
ECHO Usage:
ECHO     start.cmd      compile and start
ECHO     start.cmd c    clean, compile and start
ECHO     start.cmd h    show help
GOTO END

:END
ENDLOCAL
```

## SpringBoot 自动配置原理

SpringBoot 自动配置实际上是一种 注解 + SPI 机制，本文以 Spring Boot 2.2.0.RELEASE 为例，结合一个 Starter 示例来说明自动配置原理。

1. 一个典型的 SpringBoot 程序都会使用 @SpringBootApplication；

2. @SpringBootApplication 被 @EnableAutoConfiguration 注解；

3. @EnableAutoConfiguration 被 @Import(AutoConfigurationImportSelector.class) 注解

4. AutoConfigurationImportSelector 是一个 ImportSelector，Import 注解会调用其 selectImports 方法，并将返回的字符串作为类名创建 Bean；

5. selectImports -> getAutoConfigurationEntry -> getCandidateConfigurations -> SpringFactoriesLoader.loadFactoryNames

6. SpringFactoriesLoader.loadFactoryNames 的功能主要是从 "META-INF/spring.factories" 文件中读取第一个参数指定的配置， EnableAutoConfiguration.class;

至此，Spring Boot 自动配置的原理已经清楚了。

## Spring 临时目录被清理导致上传错误

问题：长假结束后，用户上传文件报错，错误信息如下

```text
Failed to parse multipart servlet request; nested exception is java.io.IOException: The temporary upload location [/tmp/xxxx] is not valid。
```

原因：[CentOS 会自动清理 tmp 目录下 10 天未使用的文件](https://www.cnblogs.com/cheyunhua/p/8522466.html)，临时目录被清理掉了。

解决：

1. 重启服务器
2. SpringBoot的application.properties中配置`server.tomcat.basedir`，该配置下用于配置 Tomcat 运行日志和临时文件的目录。若不配置，则默认使用系统的临时目录。
3. 启动参数 -java.tmp.dir=/path/to/application/temp/

## Spring 静态类中引用接口的多个实现

问题的背景是一个接口有多个实现，想通过一个工厂类的静态方法选择不同的实现，代码如下，关键点在于 Bean 的容器注入和 PostConstruct。

```java
package com.hiwzc.spring.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Map;

@Component
public class DemoServiceFactory {

    private static DemoServiceFactory instance;

    @Autowired
    private List<DemoService> serviceList;

    @Autowired
    private Map<String, DemoService> serviceMap;

    public static void show() {
        System.out.println("size = " + instance.serviceList.size());
        System.out.println("map = " + instance.serviceMap);
    }

    @PostConstruct
    private void init() {
        DemoServiceFactory.instance = this;
    }
}
```

## Spring 自动生成 Bean 名称的规则

Spring 对注解形式的 bean 的名字的默认处理规则是：

1. 当类的名字是以两个或以上的大写字母开头的话，bean的名字会与类名保持一致；
2. 否则将首字母小写，再拼接后面的字符；

代码：AnnotationBeanNameGenerator

```java
protected String buildDefaultBeanName(BeanDefinition definition) {
    String beanClassName = definition.getBeanClassName();
    Assert.state(beanClassName != null, "No bean class name set");
    String shortClassName = ClassUtils.getShortName(beanClassName);
    return Introspector.decapitalize(shortClassName);
}
```

Introspector.decapitalize 如下：

```java
public static String decapitalize(String name) {
    if (name == null || name.length() == 0) {
        return name;
    }
    if (name.length() > 1 && Character.isUpperCase(name.charAt(1)) &&
                    Character.isUpperCase(name.charAt(0))){
        return name;
    }
    char chars[] = name.toCharArray();
    chars[0] = Character.toLowerCase(chars[0]);
    return new String(chars);
}
```

## Spring 容器启动后执行操作

实现 ApplicationListener 接口即可，这里要注意的是，多个 Listener 在同一个线程中执行，如果某个 Listener 抛异常，则 Spring 启动失败，不会执行后面的 Listener。如果某个 Listener 的 onApplicationEvent 中的操作是阻塞，则 Spring 启动挂起，对于可能阻塞的情况，可以在 onApplicationEvent 新起一个线程来执行操作。

```java
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.stereotype.Component;

@Component
public class DemoListener implements ApplicationListener<ContextRefreshedEvent> {
    @Override
    public void onApplicationEvent(ContextRefreshedEvent contextRefreshedEvent) {
        // do Something
    }
}
```

Spring Cloud Config 环境下，存在多个有层级的 ContextRefreshedEvent，会导致 `ApplicationListener<ContextRefreshedEvent>` 执行多次，要添加状态变量控制执行次数。