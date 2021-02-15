---
title: Spring AOP 示例
toc: true
permalink: /posts/spring-aop-demo.html
categories: Spring框架
date: 2019-01-01
---

## AOP术语

AOP（Aspect Oriented Programming，面向切面编程）是OOP的延伸，它将程序中重复的代码抽取出来，需要执行时使用动态代理技术，在不修改源码的基础上，对已有方法进行增强。这样能够减少重复代码、方便程序维护。

应用执行过程中能够增强的位置称为连接点（Join point），这个点可以是调用方法时、抛出异常时、甚至修改一个字段时。实际增强的逻辑称为通知（Advice），实际被增强的位置称为切点（Poincut），切点是连接点的一个子集。切面（Aspect）是通知和切点的结合，通知和切点共同定义了切面的全部内容——它是什么，在何时和何处完成其功能，通知定义了切面的“什么”和“何时”的话，切点定义了“何处”。

把切面应用到目标对象并创建新的代理对象的过程称为织入（Weaving），切面在指定的连接点被织入到目标对象中。

Spring 切面可以应用5种类型的通知：

- 前置通知（Before）：在目标方法被调用之前调用通知功能；
- 后置通知（After）：在目标方法完成之后调用通知，此时不会关心方法的输出是什么；
- 返回通知（After Returning）：在目标方法成功执行之后调用通知；
- 异常通知（After Throwing）：在目标方法抛出异常后调用通知；
- 环绕通知（Around）：通知包裹了被通知的方法，在被通知的方法调用之前和调用之后执行自定义的行为。

在 Spring Framework 5.3.3 中，环绕通知外的其他通知的执行时机类似如下逻辑：

```java
aop() {
    //@Before
    try {
        try {
            return mi.proceed();
        }
        catch (Throwable ex) {
            //@AfterThrowing
            throw ex;
        }
        //@AfterReturning
    }
    finally {
        //@After
    }
}
```

## 一个示例

以 Spring Framework 5.3.3 为例。

定义一个切面

```java
@Aspect
public class DemoAspect {
    @Pointcut("execution(* *.foo()) || execution(* *.bar())")
    public void pointCut() {
    }

    @Before("pointCut()")
    public void before(JoinPoint joinPoint) {
        System.out.println("DemoAspect: Before, joinPoint=" + joinPoint.getSignature().getName());
    }

    @After("pointCut()")
    public void after(JoinPoint joinPoint) {
        System.out.println("DemoAspect: After, joinPoint=" + joinPoint.getSignature().getName());
    }

    @AfterReturning(pointcut ="pointCut()", returning = "returning")
    public void afterReturning(JoinPoint joinPoint, Object returning) {
        System.out.println("DemoAspect: AfterReturning, joinPoint=" + joinPoint.getSignature().getName() + ", returning = " + returning);
    }

    @AfterThrowing(pointcut = "pointCut()", throwing = "exception")
    public void afterThrowing(JoinPoint joinPoint, Exception exception) {
        System.out.println("DemoAspect: AfterThrowing, joinPoint=" + joinPoint.getSignature().getName() + ", exception = " + exception.getMessage());
    }

    @Around("execution(* *.testAopAround*())")
    public void around(ProceedingJoinPoint joinPoint) {
        try {
            System.out.println("DemoAspect: Around, Before Execute, joinPoint=" + joinPoint.getSignature().getName());
            Object result = joinPoint.proceed();
            System.out.println("DemoAspect: Around, After Execute, result = " + result + ", joinPoint=" + joinPoint.getSignature().getName());
        } catch (Throwable t) {
            System.out.println("DemoAspect: Around, Execute Exception, exception = " + t.getMessage() + ", joinPoint=" + joinPoint.getSignature().getName());
        }
    }
}
```

测试方法

```java
    public String foo() {
        System.out.println("Bean: call foo()");
        return "ok";
    }

    public void bar() {
        System.out.println("Bean: call bar()");
        throw new RuntimeException("Some Exception In Bar");
    }

    public String testAopAround() {
        System.out.println("Bean: call testAopAround()");
        return "ok";
    }

    public void testAopAroundException() {
        System.out.println("Bean: call testAopAroundException()");
        throw new RuntimeException("Some Exception In Bar");
    }
```

执行结果如下

```text
DemoAspect: Before, joinPoint=foo
Bean: call foo()
DemoAspect: AfterReturning, joinPoint=foo, returning = ok
DemoAspect: After, joinPoint=foo

DemoAspect: Before, joinPoint=bar
Bean: call bar()
DemoAspect: AfterThrowing, joinPoint=bar, exception = Some Exception In Bar
DemoAspect: After, joinPoint=bar

DemoAspect: Around, Before Execute, joinPoint=testAopAround
Bean: call testAopAround()
DemoAspect: Around, After Execute, result = ok, joinPoint=testAopAround

DemoAspect: Around, Before Execute, joinPoint=testAopAroundException
Bean: call testAopAroundException()
DemoAspect: Around, Execute Exception, exception = Some Exception In Bar, joinPoint=testAopAroundException
```

## 源码解析

AOP 先将要织入的 Advice 构造成一个拦截器链，顺序按照`Around.class, Before.class, After.class, AfterReturning.class, AfterThrowing.class`（参考org.springframework.aop.aspectj.annotation.ReflectiveAspectJAdvisorFactory.adviceMethodComparator），然后将目标方法、拦截器链封装到 ReflectiveMethodInvocation 对象，代码执行时会调用其 proceed 方法。

上面的例子中，foo 和 bar 的拦截器链如下：

- 0 = {ExposeInvocationInterceptor} 
- 1 = {MethodBeforeAdviceInterceptor} 
- 2 = {AspectJAfterAdvice}
- 3 = {AfterReturningAdviceInterceptor} 
- 4 = {AspectJAfterThrowingAdvice}

ReflectiveMethodInvocation.proceed 方法代码如下，可以看到，对于 interceptor，会依次将自己作为参数调用各个拦截器的 invoke 方法。

```java
	public Object proceed() throws Throwable {
		// We start with an index of -1 and increment early.
		if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
			return invokeJoinpoint();
		}

		Object interceptorOrInterceptionAdvice =
				this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
		if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
			// ......
		}
		else {
			// It's an interceptor, so we just invoke it: The pointcut will have
			// been evaluated statically before this object was constructed.
			return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
		}
	}
```

各个拦截器的代码如下：

ExposeInvocationInterceptor

```java
	public Object invoke(MethodInvocation mi) throws Throwable {
		MethodInvocation oldInvocation = invocation.get();
		invocation.set(mi);
		try {
			return mi.proceed();
		}
		finally {
			invocation.set(oldInvocation);
		}
	}
```

MethodBeforeAdviceInterceptor

```java
	public Object invoke(MethodInvocation mi) throws Throwable {
		this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
		return mi.proceed();
	}
```

AspectJAfterAdvice

```java
	public Object invoke(MethodInvocation mi) throws Throwable {
		try {
			return mi.proceed();
		}
		finally {
			invokeAdviceMethod(getJoinPointMatch(), null, null);
		}
	}
```

AfterReturningAdviceInterceptor

```java
	public Object invoke(MethodInvocation mi) throws Throwable {
		Object retVal = mi.proceed();
		this.advice.afterReturning(retVal, mi.getMethod(), mi.getArguments(), mi.getThis());
		return retVal;
	}
```

AspectJAfterThrowingAdvice

```java
	public Object invoke(MethodInvocation mi) throws Throwable {
		try {
			return mi.proceed();
		}
		catch (Throwable ex) {
			if (shouldInvokeOnThrowing(ex)) {
				invokeAdviceMethod(getJoinPointMatch(), null, ex);
			}
			throw ex;
		}
	}
```

adviceMethodComparator上有一段注释，虽然 @After 注解排在 @AfterReturning 和 @AfterThrowing 前，但因为是在try语句中调用 proceed() 方法，在 finally 中调用 @After 通知方法，所以 @After 通知方法实际会在 @AfterReturning 和 @AfterThrowing 通知之后被调用。

```java
// Note: although @After is ordered before @AfterReturning and @AfterThrowing,
// an @After advice method will actually be invoked after @AfterReturning and
// @AfterThrowing methods due to the fact that AspectJAfterAdvice.invoke(MethodInvocation)
// invokes proceed() in a `try` block and only invokes the @After advice method
// in a corresponding `finally` block.
```