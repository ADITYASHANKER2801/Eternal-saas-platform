"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("ed3f5d5a-2d97-4759-b671-e7090ec1d47e");
  }, []);

  return null;
};
