"use client";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const feature = [
    "No Setup Required",
    "Optimized Token Usage",
    "Works in Your Environment",
    "Start Instantly",
    "Full Prompt Customization",
    "Lower AI Usage Costs",
];

const ContextAIaware = () => {
    return (
        <section className="py-10">
            <div className="container mx-auto">

                <div className="w-full flex flex-col gap-12">
                    <div

                        className="flex flex-col items-center justify-center text-center gap-3 max-w-4xl mx-auto"
                    >


                        <h2 className="md:text-3xl text-xl font-bold max-w-3xl ">
                            Deliver faster with Context-Aware and Pre-built prompts
                        </h2>
                        <p className=" text-sm text-muted-foreground">
                            Your project is already context-aware, so you don’t need to
                            explain much to your AI assistant. Tailwind-Admin provides
                            pre-built prompts designed for your codebase and file structure,
                            so you can build features right away.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <div

                            className="relative max-h-[534px]"
                        >
                            <img
                                src="https://images.shadcnspace.com/assets/feature/feature-18-img.webp"
                                alt="feature-18"
                                width={564}
                                height={534}
                                className="rounded-xl w-full h-full object-cover"
                            />
                            <div className="absolute top-1/2 inset-x-6 -translate-y-1/2 bg-gray-950/60 px-2 py-2.5 sm:p-4 rounded-xl flex flex-col gap-3 text-white max-h-[80%] overflow-hidden">
                                <pre className="whitespace-pre-wrap text-[10px] leading-relaxed sm:text-xs md:text-sm overflow-hidden">
                                    {`# Tailwind-Admin - Complete AI Instructions

## Role & Context
You are a **Frontend Admin Dashboard Architect**. Your goal is to build a visually consistent, performant, and developer-friendly React admin dashboard. The code should be production-ready, type-safe, and leverage existing premade components and patterns whenever possible. Prioritize component reusability, maintainability, and consistency across the entire application.

## Project Overview
**Tailwind-Admin** is a modern open-source Next.js admin dashboard template built with TypeScript, Tailwind CSS, and shadcn/ui components. It features:

- **Multi-app architecture** with independent application modules (Blog, Calendar, Chat, Email, Invoices, Kanban, etc.)

`}
                                </pre>
                            </div>
                        </div>
                        <div className="flex flex-col gap-6">
                            <div

                                className="bg-background rounded-xl border border-border p-6 gap-6 flex flex-col "
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-xl sm:text-3xl font-medium text-foreground">
                                        80%
                                    </p>
                                    <svg
                                        width="30"
                                        height="30"
                                        viewBox="0 0 40 40"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M11.65 7.60799C8.57835 6.54132 6.76669 6.28132 5.69002 7.35799C4.15169 8.89799 5.34002 11.933 7.71669 18.0063L11.65 28.0613C13.92 33.8613 15.055 36.7613 16.855 36.6663C18.655 36.5697 19.4817 33.543 21.1317 27.4897C21.6234 25.688 21.8684 24.7863 22.4934 24.1613C23.1184 23.5363 24.02 23.2913 25.8217 22.7997C31.875 21.1497 34.9017 20.323 34.9984 18.523C35.0717 17.1463 33.3917 16.158 30 14.7547"
                                            stroke="var(--foreground)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M19.1667 6.66732C19.6605 8.003 20.4375 9.21596 21.4445 10.2229C22.4514 11.2298 23.6644 12.0069 25 12.5007C23.6644 12.9944 22.4514 13.7715 21.4445 14.7784C20.4375 15.7853 19.6605 16.9983 19.1667 18.334C18.6729 16.9983 17.8959 15.7853 16.889 14.7784C15.882 13.7715 14.6691 12.9944 13.3334 12.5007C14.6691 12.0069 15.882 11.2298 16.889 10.2229C17.8959 9.21596 18.6729 8.003 19.1667 6.66732ZM26.25 3.33398C26.426 3.81125 26.7033 4.24467 27.063 4.60435C27.4227 4.96402 27.8561 5.24139 28.3334 5.41732C27.8561 5.59325 27.4227 5.87061 27.063 6.23029C26.7033 6.58997 26.426 7.02339 26.25 7.50065C26.0731 7.02394 25.7954 6.59102 25.4359 6.23148C25.0763 5.87193 24.6434 5.59422 24.1667 5.41732C24.6434 5.24042 25.0763 4.96271 25.4359 4.60316C25.7954 4.24361 26.0731 3.8107 26.25 3.33398Z"
                                            stroke="var(--foreground)"
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>
                                <p className="text-sm font-normal text-muted-foreground">
                                    Significantly lower AI operating costs and training time by
                                    using structured instructions that provide instant workspace
                                    awareness for your agents.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-6 h-full">
                                <div

                                    className="bg-background rounded-xl border border-border p-6 flex flex-col justify-between self-stretch w-full"
                                >
                                    <p className="text-xl sm:text-3xl font-medium text-foreground">
                                        15+
                                    </p>
                                    <div className="flex flex-col gap-4">
                                        <p className="text-sm font-normal text-muted-foreground">
                                            Pre-built prompts and agent.md minimize token usage
                                            while generating complete dashboard modules.
                                        </p>
                                    </div>
                                </div>
                                <div

                                    className=" bg-gray-950 rounded-xl border border-border p-6 flex flex-col self-stretch justify-between  w-full"
                                >
                                    <div className="flex flex-col gap-2">
                                        <p className="text-lg font-medium text-white">
                                            Build with Agents.md, not from scratch
                                        </p>
                                        <p className="text-base font-normal text-white/50">
                                            Turn intelligent prompts into production-ready
                                            dashboards.
                                        </p>
                                    </div>
                                    <Link
                                        href={"#prompt-library"}
                                        className="w-fit group bg-gray-200 hover:bg-gray-200/80 h-auto px-5 py-2.5 flex items-center gap-2 rounded-md text-gray-950 cursor-pointer font-medium text-sm"
                                    >
                                        <span>Start Your Project</span>
                                        <ArrowUpRight
                                            size={16}
                                            className="group-hover:rotate-45 ease-in-out transition-all duration-300"
                                        />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default ContextAIaware;
