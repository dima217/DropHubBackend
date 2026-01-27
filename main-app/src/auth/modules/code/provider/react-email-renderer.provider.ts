import { Injectable } from '@nestjs/common';
import { render } from '@react-email/render';
import * as React from 'react';

@Injectable()
export class ReactEmailRendererProvider {
  async renderEmail(component: React.ReactElement): Promise<string> {
    return await render(component);
  }
}
