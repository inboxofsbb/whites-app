"use client"
import Link from "next/link";
import React, { Children } from "react";
import { usePathname } from "next/navigation";

const ActiveLink = ({ children, ...props }: any) => {
  const child = Children.only(children);
  let className = child.props.className || "";
  const isDynamicRoute = props.href.match(/^\/?\[{1,2}\.{0,3}[a-z]+\]{1,2}$/);

  if (
   usePathname()=== props.href &&
    !isDynamicRoute &&
    props.activeClassName
  ) {
    className = `${className} ${props.activeClassName}`.trim();
  } else if (usePathname() === props.as && isDynamicRoute) {
    className = `${className} ${props.activeClassName}`.trim();
  }

  delete props.activeClassName;

  return <Link {...props}><>{React.cloneElement(child, { className })}</></Link>;
};

export default ActiveLink;
